/**
 * Building blocks of the schedule fixtures (nextEntries.ts, calendarFeed.ts): a running conference
 * with its schedule switched on, and one day on a GV and an SR track.
 */
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import * as schema from '../../src/api/db/schema';
import { makeSeedCalendarDay, makeSeedCalendarTrack } from '../../src/api/db/seed-data/calendarDay';
import { upsertConference } from './conference';

/** A running conference in Berlin with the schedule shown and the assignment released. */
export async function upsertScheduleConference(
	db: NodePgDatabase,
	{ id, title, nations }: { id: string; title: string; nations: Record<string, string> }
) {
	const { id: conferenceId } = await upsertConference(db, { id, title, state: 'ACTIVE', nations });
	await db
		.update(schema.conference)
		.set({ showCalendar: true, assignmentReleased: true, timezone: 'Europe/Berlin' })
		.where(eq(schema.conference.id, conferenceId));
	return conferenceId;
}

/** One day (`date`, YYYY-MM-DD) with a GV and an SR track; `at('09:00')` is a wall-clock time on it. */
export function gvAndSrDay({ conferenceId, date }: { conferenceId: string; date: string }) {
	return {
		day: makeSeedCalendarDay({
			conferenceId,
			name: 'Sonntag',
			date: new Date(`${date}T00:00:00Z`)
		}),
		gv: makeSeedCalendarTrack({ conferenceId, name: 'GV-Track', sortOrder: 0 }),
		sr: makeSeedCalendarTrack({ conferenceId, name: 'SR-Track', sortOrder: 1 }),
		at: (time: string) => new Date(`${date}T${time}:00Z`)
	};
}

type Row<T extends { $inferInsert: object }> = T['$inferInsert'] & { id: string };

/**
 * Writes a day, its tracks (each for one committee), places and entries in one transaction: the
 * triggers check at commit that an entry's tracks run on its day.
 */
export async function insertSchedule(
	db: NodePgDatabase,
	{
		day,
		tracks,
		places = [],
		planned
	}: {
		day: Row<typeof schema.calendarDay>;
		tracks: { track: Row<typeof schema.calendarTrack>; committeeId: string }[];
		places?: Row<typeof schema.place>[];
		planned: {
			entry: Row<typeof schema.calendarEntry>;
			tracks: { id: string }[];
			surveyOptionIds?: string[];
		}[];
	}
) {
	await db.transaction(async (tx) => {
		await tx.insert(schema.calendarDay).values(day);
		await tx.insert(schema.calendarTrack).values(tracks.map(({ track }) => track));
		await tx
			.insert(schema.calendarDayToCalendarTrack)
			.values(tracks.map(({ track }) => ({ a: day.id, b: track.id })));
		await tx
			.insert(schema.calendarTrackToCommittee)
			.values(tracks.map(({ track, committeeId }) => ({ a: track.id, b: committeeId })));
		if (places.length > 0) await tx.insert(schema.place).values(places);
		await tx.insert(schema.calendarEntry).values(planned.map(({ entry }) => entry));
		await tx
			.insert(schema.calendarEntryToCalendarTrack)
			.values(
				planned.flatMap(({ entry, tracks }) =>
					tracks.map((track) => ({ a: entry.id, b: track.id }))
				)
			);
		const limited = planned.flatMap(({ entry, surveyOptionIds = [] }) =>
			surveyOptionIds.map((option) => ({ a: entry.id, b: option }))
		);
		if (limited.length > 0) await tx.insert(schema.calendarEntryToSurveyOption).values(limited);
	});
}
