import { type Transaction, db, schema } from '$api/db/db';
import { assertFirstEntryExists } from '@m1212e/rumble';
import {
	type CalendarDayExportData,
	calendarDayExportSchema
} from '$lib/schemata/calendarDayExport';
import { GraphQLError } from 'graphql';

/** The import document arrives either as a JSON string or already parsed. */
export function parseImportData(importData: unknown) {
	let raw = importData;
	if (typeof importData === 'string') {
		try {
			raw = JSON.parse(importData);
		} catch {
			throw new GraphQLError('Invalid import data: malformed JSON');
		}
	}

	const parsed = calendarDayExportSchema.safeParse(raw);
	if (!parsed.success) {
		throw new GraphQLError(`Invalid import data: ${parsed.error.message}`);
	}
	return parsed.data;
}

/** Creates the day's tracks and maps each track name to its new id. */
async function importTracks(
	tx: Transaction,
	dayId: string,
	tracks: CalendarDayExportData['tracks']
) {
	const trackIdByName = new Map<string, string>();
	for (const track of tracks) {
		const row = await tx
			.insert(schema.calendarTrack)
			.values({
				calendarDayId: dayId,
				name: track.name,
				description: track.description,
				sortOrder: track.sortOrder
			})
			.returning()
			.then(assertFirstEntryExists);
		trackIdByName.set(track.name, row.id);
	}
	return trackIdByName;
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
async function importPlaces(
	tx: Transaction,
	conferenceId: string,
	entries: CalendarDayExportData['entries']
) {
	const placeIdByName = new Map<string, string>();
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
	}
	return placeIdByName;
}

/** An "HH:MM" time anchored to the given date in UTC. */
function timeOnDay(date: Date, time: string) {
	const [hour, minute] = time.split(':').map(Number);
	const result = new Date(date);
	result.setUTCHours(hour ?? 0, minute ?? 0, 0, 0);
	return result;
}

export async function createImportedDay(
	args: { conferenceId: string; name: string; date: Date; sortOrder: number },
	importData: CalendarDayExportData
) {
	return db.transaction(async (tx) => {
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

		const trackIdByName = await importTracks(tx, day.id, importData.tracks);
		const placeIdByName = await importPlaces(tx, args.conferenceId, importData.entries);

		for (const entry of importData.entries) {
			const created = await tx
				.insert(schema.calendarEntry)
				.values({
					calendarDayId: day.id,
					name: entry.name,
					description: entry.description,
					startTime: timeOnDay(args.date, entry.startTime),
					endTime: timeOnDay(args.date, entry.endTime),
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

		return day;
	});
}
