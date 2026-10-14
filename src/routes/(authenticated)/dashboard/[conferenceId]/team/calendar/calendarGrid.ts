/**
 * The geometry and the drag maths behind the calendar editor. Everything is pure: the editor
 * turns pointer positions into minutes and column units, and these functions decide what that
 * means for an entry.
 *
 * Times are minutes since midnight of a day's wall-clock (entries store wall-clock times as UTC).
 */

export const SNAP_MINUTES = 15;
/** Shortest an entry gets by dragging. */
const MIN_DURATION = SNAP_MINUTES;
/** Last end time a drag produces: 23:45. Entries cannot run past midnight. */
export const LATEST_END = 24 * 60 - SNAP_MINUTES;
/** The space between two days, in track-column widths. */
const DAY_GAP = 0.25;

export interface Span {
	start: number;
	end: number;
}

/** The first four change the time, the last two the tracks an entry spans. */
export type DragMode = 'move' | 'resize-start' | 'resize-end' | 'resize-left' | 'resize-right';

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export function snap(minutes: number) {
	return Math.round(minutes / SNAP_MINUTES) * SNAP_MINUTES;
}

/** The wall-clock minutes since midnight of a stored time. */
export function minutesOfDay(time: Date | string) {
	const date = new Date(time);
	return date.getUTCHours() * 60 + date.getUTCMinutes();
}

/** A day's date with a wall-clock time set on it, in UTC. */
export function dateAtMinutes(dayDate: Date | string, minutes: number) {
	const date = new Date(dayDate);
	date.setUTCHours(0, minutes, 0, 0);
	return date;
}

/** `540` as `09:00`. */
export function formatMinutes(minutes: number) {
	const pad = (n: number) => n.toString().padStart(2, '0');
	return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
}

/**
 * Where an entry ends up when a drag has moved the pointer `deltaMinutes` from where it grabbed
 * the entry. Moving keeps the duration; resizing moves one edge and stops short of the other.
 */
export function dragSpan(origin: Span, mode: DragMode, deltaMinutes: number): Span {
	if (mode === 'move') {
		const duration = origin.end - origin.start;
		const start = clamp(snap(origin.start + deltaMinutes), 0, LATEST_END - duration);
		return { start, end: start + duration };
	}
	if (mode === 'resize-start') {
		return {
			start: clamp(snap(origin.start + deltaMinutes), 0, origin.end - MIN_DURATION),
			end: origin.end
		};
	}
	if (mode === 'resize-end') {
		return {
			start: origin.start,
			end: clamp(snap(origin.end + deltaMinutes), origin.start + MIN_DURATION, LATEST_END)
		};
	}
	// Stretching sideways leaves the time alone
	return { start: origin.start, end: origin.end };
}

/**
 * The range a drag on an empty slot selects. A plain click (`dragged` false) selects an hour
 * from the slot it landed on.
 */
export function createSpan(anchorMinutes: number, currentMinutes: number, dragged: boolean): Span {
	const first = Math.min(anchorMinutes, currentMinutes);
	const last = Math.max(anchorMinutes, currentMinutes);
	const start = clamp(
		Math.floor(first / SNAP_MINUTES) * SNAP_MINUTES,
		0,
		LATEST_END - MIN_DURATION
	);
	const end = dragged ? Math.ceil(last / SNAP_MINUTES) * SNAP_MINUTES : start + 60;
	return { start, end: clamp(end, start + MIN_DURATION, LATEST_END) };
}

/**
 * The whole hours the editor shows: at least 08:00 to 18:00, one spare hour around the entries
 * so there is room to drag past the first or last one, or the whole day.
 */
export function editorHourRange(spans: readonly Span[], wholeDay: boolean) {
	if (wholeDay) return { startHour: 0, endHour: 24 };
	if (spans.length === 0) return { startHour: 8, endHour: 18 };
	const earliest = Math.min(...spans.map((s) => s.start));
	const latest = Math.max(...spans.map((s) => s.end));
	return {
		startHour: clamp(Math.min(8, Math.floor(earliest / 60) - 1), 0, 23),
		endHour: clamp(Math.max(18, Math.ceil(latest / 60) + 1), 1, 24)
	};
}

/** The minutes at a vertical distance from the top of the grid. */
export function minutesAtOffset(offsetPx: number, hourHeight: number, startHour: number) {
	return clamp(startHour * 60 + (offsetPx / hourHeight) * 60, 0, 24 * 60);
}

// === Columns ===

export interface GridColumn {
	dayId: string;
	/** The track of the column; `null` for the only column of a day without tracks */
	trackId: string | null;
	/** Left edge and width, in units of one column */
	start: number;
	width: number;
}

export interface GridDayBlock {
	dayId: string;
	start: number;
	width: number;
	columns: GridColumn[];
}

export interface Grid {
	totalUnits: number;
	days: GridDayBlock[];
}

/** Lays the days out side by side, each as wide as it has tracks (a day without tracks: one). */
export function buildGrid(
	days: readonly { id: string; tracks: readonly { id: string }[] }[]
): Grid {
	let cursor = 0;
	const blocks = days.map((day): GridDayBlock => {
		const start = cursor;
		const trackIds = day.tracks.length > 0 ? day.tracks.map((t) => t.id) : [null];
		const columns = trackIds.map((trackId, i) => ({
			dayId: day.id,
			trackId,
			start: start + i,
			width: 1
		}));
		cursor += columns.length + DAY_GAP;
		return { dayId: day.id, start, width: columns.length, columns };
	});
	return { totalUnits: Math.max(cursor - DAY_GAP, 1), days: blocks };
}

/** The column under a horizontal position (in units); the gap between days belongs to a neighbour. */
export function columnAt(grid: Grid, unit: number): GridColumn | undefined {
	const block =
		grid.days.find((d) => unit < d.start + d.width + DAY_GAP / 2) ??
		grid.days[grid.days.length - 1];
	if (!block) return undefined;
	const index = clamp(Math.floor(unit - block.start), 0, block.columns.length - 1);
	return block.columns[index];
}

/** The tracks of a day in order, `[null]` for a day without any. */
const columnTrackIds = (block: GridDayBlock) => block.columns.map((c) => c.trackId);

/**
 * The tracks an entry runs on, as stored: in the day's order and without ids the day does not
 * have.
 */
export function normalizeTrackIds(
	dayTrackIds: readonly string[],
	trackIds: readonly string[]
): string[] {
	return dayTrackIds.filter((id) => trackIds.includes(id));
}

/** The columns an entry covers, as indexes into its day's columns: first to last, inclusive. */
export interface ColumnRange {
	first: number;
	last: number;
}

/**
 * The columns of `block` that `trackIds` span, from the first to the last of them (tracks in
 * between are covered too, so a stored set with a gap still draws as one block). An entry with no
 * track of the day (storage rules that out) is drawn across the whole day.
 */
function rangeOfTracks(block: GridDayBlock, trackIds: readonly string[]): ColumnRange {
	const indexes = block.columns
		.map((column, index) => (column.trackId && trackIds.includes(column.trackId) ? index : -1))
		.filter((index) => index !== -1);
	if (indexes.length === 0) return { first: 0, last: block.columns.length - 1 };
	return { first: Math.min(...indexes), last: Math.max(...indexes) };
}

/** The track ids of a column range, in the stored form. */
export function tracksOfRange(block: GridDayBlock, range: ColumnRange): string[] {
	const ids = columnTrackIds(block).filter((id): id is string => id !== null);
	return normalizeTrackIds(
		ids,
		ids.filter((_, index) => index >= range.first && index <= range.last)
	);
}

/** The horizontal extent of an entry: the columns of its tracks, or the whole day when it has none. */
export function entryExtent(
	grid: Grid,
	placement: { dayId: string; trackIds: readonly string[] }
): { start: number; width: number } | undefined {
	const block = grid.days.find((d) => d.dayId === placement.dayId);
	if (!block) return undefined;
	const { first, last } = rangeOfTracks(block, placement.trackIds);
	return { start: block.start + first, width: last - first + 1 };
}

/** The index, within its day, of the column under a horizontal position (in units). */
export function columnIndexAt(grid: Grid, unit: number) {
	const column = columnAt(grid, unit);
	const block = column && grid.days.find((d) => d.dayId === column.dayId);
	if (!column || !block) return undefined;
	return { block, index: block.columns.indexOf(column) };
}

/** The column of `block` under a horizontal position, which is clamped into the block. */
export function clampedIndex(block: GridDayBlock, unit: number) {
	return clamp(Math.floor(unit - block.start), 0, block.columns.length - 1);
}

/**
 * The day and tracks a dragged entry lands on. The column under the pointer decides: the entry
 * keeps its width and the part of it that was grabbed stays under the pointer, squeezed in where
 * the day has fewer tracks.
 */
export function dropPlacement(
	grid: Grid,
	unit: number,
	origin: { dayId: string; trackIds: readonly string[]; unit: number }
): { dayId: string; trackIds: string[] } | undefined {
	const hit = columnIndexAt(grid, unit);
	const originBlock = grid.days.find((d) => d.dayId === origin.dayId);
	if (!hit || !originBlock) return undefined;
	const { block, index } = hit;
	const from = rangeOfTracks(originBlock, origin.trackIds);
	const width = from.last - from.first + 1;

	const grabbed = clampedIndex(originBlock, origin.unit) - from.first;
	const fitted = Math.min(width, block.columns.length);
	const first = clamp(index - Math.min(grabbed, fitted - 1), 0, block.columns.length - fitted);
	return {
		dayId: block.dayId,
		trackIds: tracksOfRange(block, { first, last: first + fitted - 1 })
	};
}

/** The day block an entry sits in and the columns it spans there; both undefined for an unknown day. */
function originRange(grid: Grid, origin: { dayId: string; trackIds: readonly string[] }) {
	const block = grid.days.find((d) => d.dayId === origin.dayId);
	return { block, range: block && rangeOfTracks(block, origin.trackIds) };
}

/**
 * Stretches the columns of an entry by pulling its left or right edge to the pointer, within its
 * day. The entry keeps at least one column.
 */
export function stretchTracks(
	grid: Grid,
	origin: { dayId: string; trackIds: readonly string[] },
	mode: 'resize-left' | 'resize-right',
	unit: number
): string[] {
	const { block, range } = originRange(grid, origin);
	if (!block || !range) return [...origin.trackIds];
	const index = clampedIndex(block, unit);
	return tracksOfRange(
		block,
		mode === 'resize-left'
			? { first: Math.min(index, range.last), last: range.last }
			: { first: range.first, last: Math.max(index, range.first) }
	);
}

/**
 * The tracks of an entry nudged one column, for the keyboard: moved, or with `resize-right` its
 * right edge stretched. Stays as it is where the day has no room.
 */
export function nudgeTracks(
	grid: Grid,
	origin: { dayId: string; trackIds: readonly string[] },
	mode: 'move' | 'resize-right',
	direction: 1 | -1
): string[] {
	const { block, range } = originRange(grid, origin);
	if (!block || !range) return [...origin.trackIds];
	const last = block.columns.length - 1;
	if (mode === 'resize-right') {
		return tracksOfRange(block, {
			first: range.first,
			last: clamp(range.last + direction, range.first, last)
		});
	}
	const shift = clamp(direction, -range.first, last - range.last);
	return tracksOfRange(block, { first: range.first + shift, last: range.last + shift });
}

// === Overlaps and lanes ===

export interface Placed extends Span {
	id: string;
	dayId: string;
	/** The tracks the entry runs on */
	trackIds: string[];
}

const overlaps = (a: Span, b: Span) => a.start < b.end && b.start < a.end;

const sharesTrack = (a: readonly string[], b: readonly string[]) => a.some((id) => b.includes(id));

/** The ids of entries that collide: two that run on a common track at the same time. */
export function overlappingIds(entries: readonly Placed[]): Set<string> {
	const ids = new Set<string>();
	entries.forEach((a, i) => {
		for (const b of entries.slice(i + 1)) {
			if (a.dayId !== b.dayId || !overlaps(a, b)) continue;
			if (!sharesTrack(a.trackIds, b.trackIds)) continue;
			ids.add(a.id);
			ids.add(b.id);
		}
	});
	return ids;
}

/**
 * Side-by-side lanes for entries that share their columns and overlap, so none is hidden behind
 * another. An entry outside any overlap has one lane of one.
 */
export function assignLanes(
	entries: readonly Placed[]
): Map<string, { lane: number; lanes: number }> {
	const result = new Map<string, { lane: number; lanes: number }>();
	const groups = new Map<string, Placed[]>();
	for (const entry of entries) {
		const key = `${entry.dayId}/${entry.trackIds.join(',')}`;
		groups.set(key, [...(groups.get(key) ?? []), entry]);
	}
	for (const group of groups.values()) {
		const sorted = [...group].sort((a, b) => a.start - b.start || a.end - b.end);
		let cluster: { entry: Placed; lane: number }[] = [];
		let clusterEnd = -1;
		const laneEnds: number[] = [];
		const flush = () => {
			for (const { entry, lane } of cluster) {
				result.set(entry.id, { lane, lanes: laneEnds.length });
			}
			cluster = [];
			laneEnds.length = 0;
		};
		for (const entry of sorted) {
			if (cluster.length > 0 && entry.start >= clusterEnd) flush();
			let lane = laneEnds.findIndex((end) => end <= entry.start);
			if (lane === -1) lane = laneEnds.length;
			laneEnds[lane] = entry.end;
			cluster.push({ entry, lane });
			clusterEnd = Math.max(clusterEnd, entry.end);
		}
		flush();
	}
	return result;
}

// === Keyboard ===

export type KeyAction =
	| { type: 'open' }
	| { type: 'delete' }
	| { type: 'nudge'; mode: 'move' | 'resize'; axis: 'time' | 'tracks'; direction: 1 | -1 };

const NUDGES: Record<string, { axis: 'time' | 'tracks'; direction: 1 | -1 }> = {
	ArrowUp: { axis: 'time', direction: -1 },
	ArrowDown: { axis: 'time', direction: 1 },
	ArrowLeft: { axis: 'tracks', direction: -1 },
	ArrowRight: { axis: 'tracks', direction: 1 }
};

const KEY_TYPES: Record<string, KeyAction> = {
	Enter: { type: 'open' },
	' ': { type: 'open' },
	Delete: { type: 'delete' }
};

/**
 * What a key does on a focused entry: Enter opens it, the up and down arrows move it by a quarter
 * hour and left and right by a track (with Shift they stretch its end, or its right edge,
 * instead), Delete asks to delete it.
 */
export function keyAction(key: string, shift: boolean): KeyAction | undefined {
	const nudge = NUDGES[key];
	if (nudge) return { type: 'nudge', mode: shift ? 'resize' : 'move', ...nudge };
	return KEY_TYPES[key];
}
