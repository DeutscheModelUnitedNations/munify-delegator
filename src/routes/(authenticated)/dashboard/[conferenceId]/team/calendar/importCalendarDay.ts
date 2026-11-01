import { client } from '#lib/api/rumbleClient/client';
import { logger } from '#lib/logger';
import {
	type CalendarDayExportData,
	calendarDayExportSchema
} from '#lib/schemata/calendarDayExport';
import { dateAtMinutes } from './calendarGrid';
import { minutesOf } from './calendarEditing';

type ExportEntry = CalendarDayExportData['entries'][number];
type ExportPlace = NonNullable<ExportEntry['place']>;

/**
 * Reads a day export file. `invalid` is set when the text is not an export;
 * a read that did not yield text counts as nothing chosen.
 */
export function parseDayImport(text: unknown) {
	if (typeof text !== 'string') return { data: null, invalid: false };
	try {
		const result = calendarDayExportSchema.safeParse(JSON.parse(text));
		if (result.success) return { data: result.data, invalid: false };
	} catch {
		// not JSON at all: invalid like any other file that is no export
	}
	return { data: null, invalid: true };
}

/** The places the entries name, each once: the first entry naming a place describes it. */
export function distinctPlaces(entries: readonly ExportEntry[]): ExportPlace[] {
	const byName = new Map<string, ExportPlace>();
	for (const entry of entries) {
		if (entry.place && !byName.has(entry.place.name)) byName.set(entry.place.name, entry.place);
	}
	return [...byName.values()];
}

/**
 * The arguments that create `entry` on the imported day. An entry naming no tracks (files from
 * before entries named theirs) runs on all of the file's tracks.
 */
export function importedEntryArgs({
	entry,
	day,
	trackIdByName,
	placeIdByName
}: {
	entry: ExportEntry;
	day: { id: string; date: Date };
	trackIdByName: ReadonlyMap<string, string>;
	placeIdByName: ReadonlyMap<string, string>;
}) {
	return {
		calendarDayId: day.id,
		name: entry.name,
		description: entry.description,
		startTime: dateAtMinutes({ dayDate: day.date, minutes: minutesOf(entry.startTime) }),
		endTime: dateAtMinutes({ dayDate: day.date, minutes: minutesOf(entry.endTime) }),
		fontAwesomeIcon: entry.fontAwesomeIcon,
		color: entry.color,
		room: entry.room,
		placeId: entry.place ? (placeIdByName.get(entry.place.name) ?? null) : null,
		calendarTrackIds:
			entry.trackNames.length === 0
				? [...trackIdByName.values()]
				: entry.trackNames.flatMap((name) => trackIdByName.get(name) ?? [])
	};
}

/**
 * Lets the file's tracks run on the day. An exported day comes from any conference, so a track
 * is matched by name: the conference's track of that name is reused, the others are created.
 */
async function importTracks({
	conferenceId,
	dayId,
	tracks
}: {
	conferenceId: string;
	dayId: string;
	tracks: CalendarDayExportData['tracks'];
}) {
	const existing = await client.query.calendarTracks({
		__args: { where: { conferenceId: { eq: conferenceId } } },
		id: true,
		name: true
	});
	const existingByName = new Map(existing.map((track) => [track.name, track.id]));
	const pairs = await Promise.all(
		tracks.map(async (track): Promise<[string, string]> => {
			const id = existingByName.get(track.name);
			if (id) {
				await client.mutate.setCalendarTrackOnDay({
					__args: { id, calendarDayId: dayId, runs: true }
				});
				return [track.name, id];
			}
			const created = await client.mutate.createCalendarTrack({
				__args: {
					conferenceId,
					name: track.name,
					description: track.description,
					sortOrder: track.sortOrder,
					calendarDayIds: [dayId]
				},
				id: true
			});
			return [track.name, created.id];
		})
	);
	return new Map(pairs);
}

/** Maps each place the entries name to its id, reusing a place the conference already has. */
async function importPlaces({
	conferenceId,
	entries
}: {
	conferenceId: string;
	entries: CalendarDayExportData['entries'];
}) {
	const places = distinctPlaces(entries);
	if (places.length === 0) return new Map<string, string>();
	const existing = await client.query.places({
		__args: { where: { conferenceId: { eq: conferenceId } } },
		id: true,
		name: true
	});
	const existingByName = new Map(existing.map((place) => [place.name, place.id]));
	const pairs = await Promise.all(
		places.map(async (place): Promise<[string, string]> => {
			const id = existingByName.get(place.name);
			if (id) return [place.name, id];
			const created = await client.mutate.createPlace({
				__args: { conferenceId, ...place },
				id: true
			});
			return [place.name, created.id];
		})
	);
	return new Map(pairs);
}

/**
 * Creates a day from an export file through the ordinary mutations. When a step fails, the day
 * is deleted again; tracks and places created on the way stay, and a retry reuses them by name.
 */
export async function importCalendarDay({
	conferenceId,
	name,
	date,
	data
}: {
	conferenceId: string;
	name: string;
	date: Date;
	data: CalendarDayExportData;
}) {
	const day = await client.mutate.createCalendarDay({
		__args: { conferenceId, name, date },
		id: true
	});
	try {
		const [trackIdByName, placeIdByName] = await Promise.all([
			importTracks({ conferenceId, dayId: day.id, tracks: data.tracks }),
			importPlaces({ conferenceId, entries: data.entries })
		]);
		await Promise.all(
			data.entries.map((entry) =>
				client.mutate.createCalendarEntry({
					__args: importedEntryArgs({
						entry,
						day: { id: day.id, date },
						trackIdByName,
						placeIdByName
					}),
					id: true
				})
			)
		);
	} catch (error) {
		await Promise.resolve(client.mutate.deleteCalendarDay({ __args: { id: day.id } })).catch(
			(cleanupError: unknown) =>
				logger.error('Deleting a half imported calendar day failed', cleanupError)
		);
		throw error;
	}
}
