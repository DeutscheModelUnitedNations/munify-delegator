import { db } from '#api/db/db';
import { type ApiContext, abilityBuilder } from '#api/rumble';
import {
	PARTICIPANT_CARE_ROLES,
	assertTeamPermissionForCalendarDay,
	calendarConference,
	isTeamMemberOfConference,
	systemAdmin,
	userId
} from '#api/services/authHelper';
import { assertFindFirstExists } from '@m1212e/rumble';
import { m } from '#lib/paraglide/messages';
import { apiError } from '#api/services/errors/apiError';

export function registerCalendarEntryAbilities() {
	// Ported from abilities/entities/calendarEntry.ts
	abilityBuilder.calendarEntry.allow(['read', 'update', 'delete']).when(systemAdmin);

	// An entry without survey options is for everybody who reads the conference's schedule
	// (`calendarConference`)...
	abilityBuilder.calendarEntry.allow('read').when((ctx) => {
		const conference = calendarConference(ctx);
		return conference
			? { where: { NOT: { surveyOptions: true }, calendarDay: { conference } } }
			: undefined;
	});

	// ...one with options only for those of them who picked one of them...
	abilityBuilder.calendarEntry.allow('read').when((ctx) => {
		const id = userId(ctx);
		const conference = calendarConference(ctx);
		return id && conference
			? {
					where: {
						surveyOptions: { surveyAnswers: { participant: { userId: id } } },
						calendarDay: { conference }
					}
				}
			: undefined;
	});

	// ...and for the conference's team, which plans it.
	abilityBuilder.calendarEntry.allow('read').when((ctx) => {
		const calendarDay = isTeamMemberOfConference(ctx);
		return calendarDay ? { where: { calendarDay } } : undefined;
	});

	abilityBuilder.calendarEntry.allow(['update', 'delete']).when((ctx) => {
		const calendarDay = isTeamMemberOfConference(ctx, PARTICIPANT_CARE_ROLES);
		return calendarDay ? { where: { calendarDay } } : undefined;
	});
}

/**
 * An entry's day, tracks, place and survey options are ids from the client, so each has to belong
 * where the entry does: the track to the entry's day, the rest to the entry's conference.
 * Otherwise a conference's calendar could pull in another conference's venues, or move entries
 * over to it.
 */
async function assertReferences(
	conferenceId: string,
	refs: {
		calendarDayId: string;
		calendarTrackIds?: readonly string[];
		placeId?: string | null;
		surveyOptionIds?: readonly string[] | null;
	}
) {
	const trackIds = [...new Set(refs.calendarTrackIds ?? [])];
	if (refs.calendarTrackIds && trackIds.length === 0) {
		throw apiError('INVALID_INPUT', m.calendarEntryNeedsTrack());
	}
	const found = await Promise.all([
		db.query.calendarDay
			.findFirst({ where: { id: refs.calendarDayId, conferenceId }, columns: { id: true } })
			.then(Boolean),
		tracksOfDay(refs.calendarDayId, trackIds),
		optionalReferenceFound(refs.placeId, (id) =>
			db.query.place.findFirst({ where: { id, conferenceId }, columns: { id: true } })
		),
		surveyOptionsOfConference(conferenceId, refs.surveyOptionIds ?? [])
	]);
	if (found.includes(false)) {
		throw apiError('INVALID_INPUT', m.calendarEntryOtherConference());
	}
}

/** Whether `find` finds the row `id` names; naming none is fine. */
async function optionalReferenceFound(
	id: string | null | undefined,
	find: (id: string) => Promise<unknown>
) {
	return !id || !!(await find(id));
}

/** Whether every one of `optionIds` is an option of a survey question of the conference. */
async function surveyOptionsOfConference(conferenceId: string, optionIds: readonly string[]) {
	const ids = [...new Set(optionIds)];
	if (ids.length === 0) return true;
	const options = await db.query.surveyOption.findMany({
		where: { id: { in: ids }, question: { conferenceId } },
		columns: { id: true }
	});
	return options.length === ids.length;
}

/** Whether every one of `trackIds` is a track of the day. */
async function tracksOfDay(calendarDayId: string, trackIds: string[]) {
	if (trackIds.length === 0) return true;
	const tracks = await db.query.calendarTrack.findMany({
		where: { id: { in: trackIds }, calendarDayId },
		columns: { id: true }
	});
	return tracks.length === trackIds.length;
}

/**
 * Refuses unless the caller may add the entry to the day, with the tracks, place and survey
 * options it names.
 */
export async function assertCanCreateCalendarEntry(
	ctx: ApiContext,
	args: {
		calendarDayId: string;
		calendarTrackIds?: readonly string[] | null;
		placeId?: string | null;
		surveyOptionIds?: readonly string[] | null;
	}
) {
	const day = await assertTeamPermissionForCalendarDay(ctx, args.calendarDayId);
	await assertReferences(day.conferenceId, {
		calendarDayId: args.calendarDayId,
		calendarTrackIds: args.calendarTrackIds ?? [],
		placeId: args.placeId,
		surveyOptionIds: args.surveyOptionIds
	});
}

/**
 * Refuses unless the caller may update the entry, and the day, tracks, place and survey options it
 * is given belong to its conference.
 */
export async function assertCanUpdateCalendarEntry(
	ctx: ApiContext,
	args: {
		id: string;
		calendarDayId?: string | null;
		calendarTrackIds?: readonly string[] | null;
		placeId?: string | null;
		surveyOptionIds?: readonly string[] | null;
	}
) {
	const entry = await db.query.calendarEntry
		.findFirst({
			...(await ctx.abilities.calendarEntry.filter('update')).merge({ where: { id: args.id } })
				.query.single,
			columns: { calendarDayId: true },
			with: {
				calendarDay: { columns: { conferenceId: true } },
				tracks: { columns: { id: true } }
			}
		})
		.then(assertFindFirstExists);
	const calendarDayId = args.calendarDayId ?? entry.calendarDayId;
	await assertReferences(entry.calendarDay.conferenceId, {
		calendarDayId,
		// Moving to another day takes the tracks along only if they are that day's too.
		calendarTrackIds: args.calendarTrackIds ?? entry.tracks.map((track) => track.id),
		placeId: args.placeId,
		surveyOptionIds: args.surveyOptionIds
	});
}
