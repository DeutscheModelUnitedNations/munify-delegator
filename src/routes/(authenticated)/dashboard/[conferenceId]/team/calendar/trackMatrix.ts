/** A day as the track matrix sees it: its tracks, each with the entries that run on it. */
export interface MatrixDay {
	id: string;
	name: string;
	date: Date;
	sortOrder: number;
	entries: { id: string }[];
	tracks: {
		id: string;
		name: string;
		description: string | null;
		sortOrder: number;
		entries: { id: string }[];
	}[];
}

/** One matrix row: a track name that exists on at least one day. */
export interface TrackRow {
	name: string;
	description: string | null;
}

/**
 * The rows of the matrix: every track name across the days, ordered by the lowest sort order the
 * name has anywhere (ties by first appearance). The description is the first one found.
 */
export function trackRows(days: readonly MatrixDay[]): TrackRow[] {
	const found = new Map<string, { description: string | null; order: number }>();
	for (const track of days.flatMap((day) => day.tracks)) {
		const known = found.get(track.name) ?? {
			description: null,
			order: track.sortOrder
		};
		known.order = Math.min(known.order, track.sortOrder);
		known.description ??= track.description;
		found.set(track.name, known);
	}
	return [...found.entries()]
		.sort((a, b) => a[1].order - b[1].order)
		.map(([name, { description }]) => ({ name, description }));
}

/**
 * The tracks whose sort order changes when the row `name` is dropped at row index `toIndex`.
 * Every track takes its row's index as sort order, which also repairs gaps and ties.
 */
export function rowOrderChanges(
	days: readonly MatrixDay[],
	rows: readonly TrackRow[],
	name: string,
	toIndex: number
): { id: string; sortOrder: number }[] {
	const order = rows.map((row) => row.name);
	const from = order.indexOf(name);
	if (from === -1 || toIndex < 0 || toIndex >= order.length || from === toIndex) return [];
	order.splice(from, 1);
	order.splice(toIndex, 0, name);
	return days
		.flatMap((day) => day.tracks)
		.map((track) => ({
			id: track.id,
			sortOrder: order.indexOf(track.name),
			before: track.sortOrder
		}))
		.filter((track) => track.sortOrder !== track.before)
		.map(({ id, sortOrder }) => ({ id, sortOrder }));
}
