import { db, type Transaction, schema } from '#api/db/db';
import { assertFirstEntryExists } from '@m1212e/rumble';
import {
	type CalendarDayExportData,
	calendarDayExportSchema
} from '#lib/schemata/calendarDayExport';
import { m } from '#lib/paraglide/messages';
import { jsonDocument } from '#api/services/argSchemas';
import {
	calendarDayPubsub,
	calendarEntryPubsub,
	calendarTrackPubsub,
	placePubsub
} from '#api/pubsub';

/** The import document, sent as a JSON string or already parsed. */
export const importDataSchema = jsonDocument({
	schema: calendarDayExportSchema,
	malformed: () => m.calendarImportMalformed(),
	invalid: (details) => m.calendarImportInvalid({ details })
});

/**
 * Lets the file's tracks run on the day and maps each track name to its id. An exported day
 * comes from any conference, so its tracks can only name one by name: the conference's track of
 * that name is reused (names are unique there), the others are created.
 */
async function importTracks({
	tx,
	conferenceId,
	dayId,
	tracks
}: {
	tx: Transaction;
	conferenceId: string;
	dayId: string;
	tracks: CalendarDayExportData['tracks'];
}) {
	const trackIdByName = new Map<string, string>();
	let created = false;
	for (const track of tracks) {
		const existing = await tx.query.calendarTrack.findFirst({
			where: { conferenceId, name: track.name },
			columns: { id: true }
		});
		const id =
			existing?.id ??
			(
				await tx
					.insert(schema.calendarTrack)
					.values({
						conferenceId,
						name: track.name,
						description: track.description,
						sortOrder: track.sortOrder
					})
					.returning({ id: schema.calendarTrack.id })
					.then(assertFirstEntryExists)
			).id;
		created ||= !existing;
		await tx
			.insert(schema.calendarDayToCalendarTrack)
			.values({ a: dayId, b: id })
			.onConflictDoNothing();
		trackIdByName.set(track.name, id);
	}
	return { trackIdByName, created };
}

/** The places the entries name, each once: the first entry naming a place describes it. */
function distinctPlaces(entries: CalendarDayExportData['entries']) {
	const byName = new Map<string, NonNullable<CalendarDayExportData['entries'][number]['place']>>();
	for (const entry of entries) {
		if (entry.place && !byName.has(entry.place.name)) byName.set(entry.place.name, entry.place);
	}
	return [...byName.values()];
}

/** Maps each place the entries name to its id, reusing a place the conference already has. */
async function importPlaces({
	tx,
	conferenceId,
	entries
}: {
	tx: Transaction;
	conferenceId: string;
	entries: CalendarDayExportData['entries'];
}) {
	const placeIdByName = new Map<string, string>();
	let created = false;
	for (const place of distinctPlaces(entries)) {
		const existing = await tx.query.place.findFirst({
			where: { conferenceId, name: place.name }
		});
		if (existing) {
			placeIdByName.set(place.name, existing.id);
			continue;
		}

		const row = await tx
			.insert(schema.place)
			.values({
				conferenceId,
				name: place.name,
				address: place.address,
				latitude: place.latitude,
				longitude: place.longitude,
				directions: place.directions,
				info: place.info,
				websiteUrl: place.websiteUrl
			})
			.returning()
			.then(assertFirstEntryExists);
		placeIdByName.set(place.name, row.id);
		created = true;
	}
	if (created) placePubsub.created();
	return placeIdByName;
}

/** An "HH:MM" time anchored to the given date in UTC. */
function timeOnDay({ date, time }: { date: Date; time: string }) {
	const [hour, minute] = time.split(':').map(Number);
	const result = new Date(date);
	result.setUTCHours(hour ?? 0, minute ?? 0, 0, 0);
	return result;
}

export async function createImportedDay({
	args,
	importData
}: {
	args: { conferenceId: string; name: string; date: Date; sortOrder: number };
	importData: CalendarDayExportData;
}) {
	const day = await db.transaction(async (tx) => {
		const day = await tx
			.insert(schema.calendarDay)
			.values({
				conferenceId: args.conferenceId,
				name: args.name,
				date: args.date,
				sortOrder: args.sortOrder
			})
			.returning()
			.then(assertFirstEntryExists);

		const { trackIdByName, created: tracksCreated } = await importTracks({
			tx,
			conferenceId: args.conferenceId,
			dayId: day.id,
			tracks: importData.tracks
		});
		const placeIdByName = await importPlaces({
			tx,
			conferenceId: args.conferenceId,
			entries: importData.entries
		});

		for (const entry of importData.entries) {
			const created = await tx
				.insert(schema.calendarEntry)
				.values({
					calendarDayId: day.id,
					name: entry.name,
					description: entry.description,
					startTime: timeOnDay({ date: args.date, time: entry.startTime }),
					endTime: timeOnDay({ date: args.date, time: entry.endTime }),
					fontAwesomeIcon: entry.fontAwesomeIcon,
					color: entry.color,
					room: entry.room,
					placeId: entry.place ? (placeIdByName.get(entry.place.name) ?? null) : null
				})
				.returning()
				.then(assertFirstEntryExists);
			// Files from before an entry named its tracks leave them out for "all tracks"
			const trackIds =
				entry.trackNames.length === 0
					? [...trackIdByName.values()]
					: entry.trackNames.flatMap((name) => trackIdByName.get(name) ?? []);
			if (trackIds.length > 0) {
				await tx
					.insert(schema.calendarEntryToCalendarTrack)
					.values(trackIds.map((trackId) => ({ a: created.id, b: trackId })));
			}
		}

		return { ...day, tracksCreated };
	});
	calendarDayPubsub.created();
	if (day.tracksCreated) calendarTrackPubsub.created();
	if (importData.entries.length > 0) calendarEntryPubsub.created();
	return day;
}
