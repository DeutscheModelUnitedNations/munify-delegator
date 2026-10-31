/** A day as the track matrix sees it: the tracks that run on it, and its entries. */
export interface MatrixDay {
	id: string;
	name: string;
	date: Date;
	entries: { id: string }[];
	tracks: { id: string }[];
}

/** One matrix row: a track of the conference, with the entries on it on any day. */
export interface MatrixTrack {
	id: string;
	name: string;
	description: string | null;
	sortOrder: number;
	committees: { id: string }[];
	conferenceRoles: { id: string }[];
	entries: { id: string; calendarDayId: string }[];
}

/** Whether `track` runs on `day`. */
export function runsOn({ track, day }: { track: { id: string }; day: MatrixDay }) {
	return day.tracks.some((t) => t.id === track.id);
}

/** The entries taking a track off the given days would take off it (or delete). */
export function entriesOnDays({
	tracks,
	dayIds
}: {
	tracks: readonly MatrixTrack[];
	dayIds: readonly string[];
}) {
	const days = new Set(dayIds);
	return new Set(
		tracks.flatMap((track) =>
			track.entries.filter((entry) => days.has(entry.calendarDayId)).map((entry) => entry.id)
		)
	);
}

/**
 * The tracks whose sort order changes when `trackId` is dropped at row index `toIndex`. Every
 * track takes its row's index as sort order, which also repairs gaps and ties.
 */
export function rowOrderChanges({
	tracks,
	trackId,
	toIndex
}: {
	tracks: readonly MatrixTrack[];
	trackId: string;
	toIndex: number;
}): { id: string; sortOrder: number }[] {
	const order = [...tracks].sort((a, b) => a.sortOrder - b.sortOrder);
	const from = order.findIndex((track) => track.id === trackId);
	if (from === -1 || toIndex < 0 || toIndex >= order.length || from === toIndex) return [];
	const [moved] = order.splice(from, 1);
	order.splice(toIndex, 0, moved);
	return order
		.map((track, index) => ({ id: track.id, sortOrder: index, before: track.sortOrder }))
		.filter((track) => track.sortOrder !== track.before)
		.map(({ id, sortOrder }) => ({ id, sortOrder }));
}
