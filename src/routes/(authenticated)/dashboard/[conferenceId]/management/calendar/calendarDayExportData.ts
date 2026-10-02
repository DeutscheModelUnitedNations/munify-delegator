import type { CalendarDayExportData } from '$lib/schemata/calendarDayExport';
import { toTimeString } from './calendarTime';

type ExportEntry = CalendarDayExportData['entries'][number];
type ExportPlace = NonNullable<ExportEntry['place']>;

/** A field the query may leave out or return as null. */
type Maybe<T> = T | null | undefined;

interface SourceTrack {
	id: string;
	name: string;
	description?: Maybe<string>;
	sortOrder: number;
}

interface SourcePlace {
	name: string;
	address?: Maybe<string>;
	latitude?: Maybe<number>;
	longitude?: Maybe<number>;
	directions?: Maybe<string>;
	info?: Maybe<string>;
	websiteUrl?: Maybe<string>;
}

interface SourceEntry {
	name: string;
	description?: Maybe<string>;
	startTime: Date | string;
	endTime: Date | string;
	fontAwesomeIcon?: Maybe<string>;
	color: ExportEntry['color'];
	room?: Maybe<string>;
	calendarTrackId?: Maybe<string>;
	place?: Maybe<SourcePlace>;
}

/** The day as `exportCalendarDay` fetches it. */
export interface CalendarDayExportSource {
	tracks: readonly SourceTrack[];
	entries: readonly SourceEntry[];
}

function exportPlace(place: SourcePlace): ExportPlace {
	return {
		name: place.name,
		address: place.address ?? null,
		latitude: place.latitude ?? null,
		longitude: place.longitude ?? null,
		directions: place.directions ?? null,
		info: place.info ?? null,
		websiteUrl: place.websiteUrl ?? null
	};
}

function trackNameOf(entry: SourceEntry, tracks: readonly SourceTrack[]): string | null {
	if (!entry.calendarTrackId) return null;
	return tracks.find((t) => t.id === entry.calendarTrackId)?.name ?? null;
}

function exportEntry(entry: SourceEntry, tracks: readonly SourceTrack[]): ExportEntry {
	return {
		name: entry.name,
		description: entry.description ?? null,
		startTime: toTimeString(new Date(entry.startTime)),
		endTime: toTimeString(new Date(entry.endTime)),
		fontAwesomeIcon: entry.fontAwesomeIcon ?? null,
		color: entry.color,
		room: entry.room ?? null,
		trackName: trackNameOf(entry, tracks),
		place: entry.place ? exportPlace(entry.place) : null
	};
}

/**
 * A day's tracks and entries as an import file: ids are dropped, an entry names its track instead
 * of referencing it, and times become `HH:mm` so the file can be imported into any other day.
 */
export function toCalendarDayExport(day: CalendarDayExportSource): CalendarDayExportData {
	return {
		version: 1,
		tracks: day.tracks.map((t) => ({
			name: t.name,
			description: t.description ?? null,
			sortOrder: t.sortOrder
		})),
		entries: day.entries.map((e) => exportEntry(e, day.tracks))
	};
}
