import { db, type Transaction, schema } from '#api/db/db';
import { assertFirstEntryExists } from '@m1212e/rumble';
import { whereRows } from '#api/db/whereRows';
import { apiError, isUniqueViolationOn } from '#api/services/errors';
import { daySortOrder } from './daySortOrder';
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

/** What a new day needs, whether it starts empty or is imported. */
interface NewDay {
	conferenceId: string;
	name: string;
	date: Date;
}

/**
 * The sort order a day on `date` gets among the conference's other days (`daySortOrder`), read in
 * the transaction that writes it.
 */
async function sortOrderFor({
	tx,
	conferenceId,
	date,
	dayId
}: {
	tx: Transaction;
	conferenceId: string;
	date: Date;
	dayId?: string;
}) {
	const others = await tx.query.calendarDay.findMany({
		where: { conferenceId, ...(dayId && { id: { ne: dayId } }) },
		columns: { date: true, sortOrder: true }
	});
	return daySortOrder({ date, others });
}

/**
 * Turns the unique index on the days' order, which a day placed at the same moment can take
 * first, into CONFLICT: placing it again finds a free place.
 */
async function refusingTakenPlace<T>(write: Promise<T>) {
	try {
		return await write;
	} catch (error) {
		if (isUniqueViolationOn({ error, column: 'sort_order' })) {
			throw apiError({ code: 'CONFLICT', message: m.calendarDayPlaceTaken() });
		}
		throw error;
	}
}

/** Inserts a day, placed among the conference's days by its date. Returns its id. */
async function insertDay({ tx, day }: { tx: Transaction; day: NewDay }) {
	const sortOrder = await sortOrderFor({ tx, conferenceId: day.conferenceId, date: day.date });
	const created = await tx
		.insert(schema.calendarDay)
		.values({ conferenceId: day.conferenceId, name: day.name, date: day.date, sortOrder })
		.returning({ id: schema.calendarDay.id })
		.then(assertFirstEntryExists);
	return created.id;
}

/** Adds an empty day to the conference's schedule, placed by its date. Returns its id. */
export async function createCalendarDay(day: NewDay) {
	const id = await refusingTakenPlace(db.transaction((tx) => insertDay({ tx, day })));
	calendarDayPubsub.created();
	return id;
}

/**
 * Changes the given fields of a day; left out or null keeps a field. A day given another date is
 * placed among the conference's days anew, one keeping its date keeps its place.
 */
export async function updateCalendarDay({
	day,
	name,
	date
}: {
	day: { id: string; conferenceId: string };
	name?: string | null;
	date?: Date | null;
}) {
	await refusingTakenPlace(
		db.transaction(async (tx) => {
			const stored = await tx.query.calendarDay.findFirst({
				where: { id: day.id },
				columns: { date: true }
			});
			const moved = !!date && !!stored && stored.date.getTime() !== date.getTime();
			await tx
				.update(schema.calendarDay)
				.set({
					name: name ?? undefined,
					date: date ?? undefined,
					sortOrder: moved
						? await sortOrderFor({ tx, conferenceId: day.conferenceId, date, dayId: day.id })
						: undefined
				})
				.where(whereRows({ table: schema.calendarDay, filter: { id: day.id } }));
		})
	);
	calendarDayPubsub.updated(day.id);
}

/**
 * Deletes a day with its entries. The conference's tracks stay; they no longer run on it, which
 * their readers are told.
 */
export async function deleteCalendarDay(id: string) {
	const { entryCount, trackIds } = await db.transaction(async (tx) => {
		const day = await tx.query.calendarDay.findFirst({
			where: { id },
			columns: { id: true },
			with: { entries: { columns: { id: true } }, tracks: { columns: { id: true } } }
		});
		await tx
			.delete(schema.calendarDay)
			.where(whereRows({ table: schema.calendarDay, filter: { id } }));
		return {
			entryCount: day?.entries.length ?? 0,
			trackIds: day?.tracks.map((track) => track.id) ?? []
		};
	});
	calendarDayPubsub.removed();
	if (entryCount > 0) calendarEntryPubsub.removed();
	if (trackIds.length > 0) calendarTrackPubsub.updated(trackIds);
}

/** The import document, sent as a JSON string or already parsed. */
export const importDataSchema = jsonDocument({
	schema: calendarDayExportSchema,
	malformed: () => m.calendarImportMalformed(),
	invalid: (details) => m.calendarImportInvalid({ details })
});

/**
 * Lets the file's tracks run on the day and maps each track name to its id. An exported day
 * comes from any conference, so its tracks can only name one by name: the conference's track of
 * that name is reused (names are unique there), the others are created. Returns whether one was
 * created and the ids of those reused, to announce after the commit.
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
	const reusedIds: string[] = [];
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
		if (existing) reusedIds.push(existing.id);
		else created = true;
		await tx
			.insert(schema.calendarDayToCalendarTrack)
			.values({ a: dayId, b: id })
			.onConflictDoNothing();
		trackIdByName.set(track.name, id);
	}
	return { trackIdByName, created, reusedIds };
}

/** The places the entries name, each once: the first entry naming a place describes it. */
function distinctPlaces(entries: CalendarDayExportData['entries']) {
	const byName = new Map<string, NonNullable<CalendarDayExportData['entries'][number]['place']>>();
	for (const entry of entries) {
		if (entry.place && !byName.has(entry.place.name)) byName.set(entry.place.name, entry.place);
	}
	return [...byName.values()];
}

/**
 * Maps each place the entries name to its id, reusing a place the conference already has, and
 * says whether one was created, to announce after the commit.
 */
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
			where: { conferenceId, name: place.name },
			columns: { id: true }
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
			.returning({ id: schema.place.id })
			.then(assertFirstEntryExists);
		placeIdByName.set(place.name, row.id);
		created = true;
	}
	return { placeIdByName, created };
}

/** An "HH:MM" time anchored to the given date in UTC. */
function timeOnDay({ date, time }: { date: Date; time: string }) {
	const [hour, minute] = time.split(':').map(Number);
	const result = new Date(date);
	result.setUTCHours(hour ?? 0, minute ?? 0, 0, 0);
	return result;
}

/**
 * Creates a day from an exported document, placed by its date: its tracks and places are matched
 * by name within the conference and reused, its entries' times ("HH:MM") anchored to the date in
 * UTC. Returns the day's id.
 */
export async function createImportedDay({
	day,
	importData
}: {
	day: NewDay;
	importData: CalendarDayExportData;
}) {
	const imported = await refusingTakenPlace(
		db.transaction(async (tx) => {
			const dayId = await insertDay({ tx, day });
			const tracks = await importTracks({
				tx,
				conferenceId: day.conferenceId,
				dayId,
				tracks: importData.tracks
			});
			const places = await importPlaces({
				tx,
				conferenceId: day.conferenceId,
				entries: importData.entries
			});

			for (const entry of importData.entries) {
				const created = await tx
					.insert(schema.calendarEntry)
					.values({
						calendarDayId: dayId,
						name: entry.name,
						description: entry.description,
						startTime: timeOnDay({ date: day.date, time: entry.startTime }),
						endTime: timeOnDay({ date: day.date, time: entry.endTime }),
						fontAwesomeIcon: entry.fontAwesomeIcon,
						color: entry.color,
						room: entry.room,
						placeId: entry.place ? (places.placeIdByName.get(entry.place.name) ?? null) : null
					})
					.returning({ id: schema.calendarEntry.id })
					.then(assertFirstEntryExists);
				// Files from before an entry named its tracks leave them out for "all tracks"
				const trackIds =
					entry.trackNames.length === 0
						? [...tracks.trackIdByName.values()]
						: entry.trackNames.flatMap((name) => tracks.trackIdByName.get(name) ?? []);
				if (trackIds.length > 0) {
					await tx
						.insert(schema.calendarEntryToCalendarTrack)
						.values(trackIds.map((trackId) => ({ a: created.id, b: trackId })));
				}
			}

			return { dayId, tracks, placesCreated: places.created };
		})
	);
	calendarDayPubsub.created();
	if (imported.tracks.created) calendarTrackPubsub.created();
	// reused tracks run on one more day
	if (imported.tracks.reusedIds.length > 0) calendarTrackPubsub.updated(imported.tracks.reusedIds);
	if (imported.placesCreated) placePubsub.created();
	if (importData.entries.length > 0) calendarEntryPubsub.created();
	return imported.dayId;
}
