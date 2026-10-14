import { calendarDayExportSchema } from '$lib/schemata/calendarDayExport';
import { dateAtMinutes } from './calendarGrid';

/** Pure decisions behind the calendar management tabs. */

interface OrderedDay {
	date: Date | string;
	sortOrder: number;
}

const timeOf = (day: OrderedDay) => new Date(day.date).getTime();

/**
 * The sort order for a day on `date`, so that days stay in date order without anyone typing a
 * number. It goes right after the last earlier day, or before the first later one; days are
 * unique by sort order, so when that place is taken it goes last.
 */
export function daySortOrder(date: Date | string, others: readonly OrderedDay[]) {
	const time = new Date(date).getTime();
	const taken = new Set(others.map((d) => d.sortOrder));
	const byDate = [...others].sort((a, b) => timeOf(a) - timeOf(b) || a.sortOrder - b.sortOrder);
	const previous = byDate.filter((d) => timeOf(d) <= time).at(-1);
	const next = byDate.find((d) => timeOf(d) > time);
	const candidate = previous ? previous.sortOrder + 1 : next ? next.sortOrder - 1 : 0;
	const fits = !taken.has(candidate) && (!next || candidate < next.sortOrder);
	return fits ? candidate : Math.max(-1, ...taken) + 1;
}

/**
 * The fields a day form writes. A day that keeps its date keeps its place; otherwise it is
 * placed by its date among the `others`.
 */
export function dayFields(
	name: string,
	date: string,
	others: readonly OrderedDay[],
	current?: OrderedDay
) {
	const day = new Date(date);
	const keeps = current && timeOf(current) === day.getTime();
	return { name, date: day, sortOrder: keeps ? current.sortOrder : daySortOrder(day, others) };
}

/** The fields a track form writes; an empty description is stored as none. */
export function trackFields(name: string, description: string, sortOrder: number) {
	return { name, description: description || null, sortOrder };
}

/**
 * The tracks whose sort order changes when `trackId` moves one place (-1 earlier, +1 later). The
 * order is renumbered 0, 1, 2, … so gaps and ties in old data are repaired on the way.
 */
export function trackOrderChanges(
	tracks: readonly { id: string; sortOrder: number }[],
	trackId: string,
	direction: -1 | 1
): { id: string; sortOrder: number }[] {
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
	/** The tracks the entry runs on; none means all of them */
	trackIds: string[];
}

const minutesOf = (time: string) => {
	const [hours, minutes] = time.split(':').map(Number);
	return hours * 60 + minutes;
};

/** The fields an entry form writes for an entry on the day dated `dayDate`. */
export function entryFields<Color>(form: EntryFormValues<Color>, dayDate: Date | string) {
	return {
		name: form.name,
		description: form.description || null,
		startTime: dateAtMinutes(dayDate, minutesOf(form.startTime)),
		endTime: dateAtMinutes(dayDate, minutesOf(form.endTime)),
		fontAwesomeIcon: form.icon || null,
		color: form.color,
		placeId: form.placeId || null,
		room: form.room || null,
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
