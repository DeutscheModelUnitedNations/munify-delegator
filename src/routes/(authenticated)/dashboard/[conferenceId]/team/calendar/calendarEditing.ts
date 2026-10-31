import { calendarDayExportSchema } from '#lib/schemata/calendarDayExport';
import { dateAtMinutes } from './calendarGrid';

/** Pure decisions behind the calendar management tabs. */

/** The fields a track form writes; an empty description is stored as none. */
export function trackFields({
	name,
	description,
	sortOrder
}: {
	name: string;
	description: string;
	sortOrder: number;
}) {
	return { name, description: description || null, sortOrder };
}

/**
 * The tracks whose sort order changes when `trackId` moves one place (-1 earlier, +1 later). The
 * order is renumbered 0, 1, 2, … so gaps and ties in old data are repaired on the way.
 */
export function trackOrderChanges({
	tracks,
	trackId,
	direction
}: {
	tracks: readonly { id: string; sortOrder: number }[];
	trackId: string;
	direction: -1 | 1;
}): { id: string; sortOrder: number }[] {
	const ordered = [...tracks].sort((a, b) => a.sortOrder - b.sortOrder);
	const from = ordered.findIndex((t) => t.id === trackId);
	const to = from + direction;
	if (from === -1 || to < 0 || to >= ordered.length) return [];
	[ordered[from], ordered[to]] = [ordered[to], ordered[from]];
	return ordered
		.map((track, index) => ({ id: track.id, sortOrder: index, before: track.sortOrder }))
		.filter((track) => track.sortOrder !== track.before)
		.map(({ id, sortOrder }) => ({ id, sortOrder }));
}

/** What the entry form holds; times are `HH:mm`, empty text stands for none. */
interface EntryFormValues<Color> {
	name: string;
	description: string;
	startTime: string;
	endTime: string;
	icon: string;
	color: Color;
	placeId: string | null;
	room: string;
	/** The survey options whose choosers alone see the entry; none shows it to everybody */
	surveyOptionIds: string[];
	/** The tracks the entry runs on; none means all of them */
	trackIds: string[];
}

const minutesOf = (time: string) => {
	const [hours, minutes] = time.split(':').map(Number);
	return hours * 60 + minutes;
};

/** The fields an entry form writes for an entry on the day dated `dayDate`. */
export function entryFields<Color>({
	form,
	dayDate
}: {
	form: EntryFormValues<Color>;
	dayDate: Date | string;
}) {
	return {
		name: form.name,
		description: form.description || null,
		startTime: dateAtMinutes({ dayDate, minutes: minutesOf(form.startTime) }),
		endTime: dateAtMinutes({ dayDate, minutes: minutesOf(form.endTime) }),
		fontAwesomeIcon: form.icon || null,
		color: form.color,
		placeId: form.placeId || null,
		room: form.room || null,
		surveyOptionIds: form.surveyOptionIds,
		calendarTrackIds: form.trackIds
	};
}

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
