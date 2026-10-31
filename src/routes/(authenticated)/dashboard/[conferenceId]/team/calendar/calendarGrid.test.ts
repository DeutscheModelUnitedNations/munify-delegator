import { describe, expect, test } from 'vitest';
import {
	assignLanes,
	buildGrid,
	columnAt,
	createSpan,
	dateAtMinutes,
	dragSpan,
	dropPlacement,
	editorHourRange,
	entryExtent,
	formatMinutes,
	keyAction,
	LATEST_END,
	minutesAtOffset,
	minutesOfDay,
	normalizeTrackIds,
	nudgeTracks,
	overlappingIds,
	snap,
	stretchTracks
} from './calendarGrid';

describe('minutes', () => {
	test('snap to quarter hours', () => {
		expect(snap(7)).toBe(0);
		expect(snap(8)).toBe(15);
		expect(snap(547)).toBe(540);
	});

	test('read and written as UTC wall-clock', () => {
		const date = dateAtMinutes({ dayDate: '2026-03-12T00:00:00Z', minutes: 9 * 60 + 30 });
		expect(date.toISOString()).toBe('2026-03-12T09:30:00.000Z');
		expect(minutesOfDay(date)).toBe(570);
		expect(formatMinutes(570)).toBe('09:30');
	});
});

describe('dragSpan', () => {
	const origin = { start: 9 * 60, end: 10 * 60 };

	test('moving keeps the duration and snaps', () => {
		expect(dragSpan({ origin, mode: 'move', deltaMinutes: 38 })).toEqual({
			start: 9 * 60 + 45,
			end: 10 * 60 + 45
		});
	});

	test('moving stays inside the day', () => {
		expect(dragSpan({ origin, mode: 'move', deltaMinutes: -1000 })).toEqual({ start: 0, end: 60 });
		expect(dragSpan({ origin, mode: 'move', deltaMinutes: 5000 })).toEqual({
			start: LATEST_END - 60,
			end: LATEST_END
		});
	});

	test('resizing moves one edge and keeps a minimum duration', () => {
		expect(dragSpan({ origin, mode: 'resize-end', deltaMinutes: 30 })).toEqual({
			start: 540,
			end: 630
		});
		expect(dragSpan({ origin, mode: 'resize-end', deltaMinutes: -600 })).toEqual({
			start: 540,
			end: 555
		});
		expect(dragSpan({ origin, mode: 'resize-start', deltaMinutes: -30 })).toEqual({
			start: 510,
			end: 600
		});
		expect(dragSpan({ origin, mode: 'resize-start', deltaMinutes: 600 })).toEqual({
			start: 585,
			end: 600
		});
	});
});

describe('createSpan', () => {
	test('a click selects an hour from the slot', () => {
		expect(
			createSpan({ anchorMinutes: 9 * 60 + 20, currentMinutes: 9 * 60 + 20, dragged: false })
		).toEqual({ start: 555, end: 615 });
	});

	test('a drag selects the dragged range, in either direction', () => {
		expect(
			createSpan({ anchorMinutes: 9 * 60 + 20, currentMinutes: 10 * 60 + 40, dragged: true })
		).toEqual({ start: 555, end: 645 });
		expect(
			createSpan({ anchorMinutes: 10 * 60 + 40, currentMinutes: 9 * 60 + 20, dragged: true })
		).toEqual({ start: 555, end: 645 });
	});

	test('a tiny drag is still a quarter hour at least', () => {
		expect(createSpan({ anchorMinutes: 540, currentMinutes: 541, dragged: true })).toEqual({
			start: 540,
			end: 555
		});
	});

	test('stays inside the day', () => {
		expect(
			createSpan({ anchorMinutes: 23 * 60 + 50, currentMinutes: 23 * 60 + 50, dragged: false })
		).toEqual({
			start: 23 * 60 + 45 - 15,
			end: LATEST_END
		});
	});
});

describe('editorHourRange', () => {
	test('shows 8 to 18 for an empty day', () => {
		expect(editorHourRange({ spans: [], wholeDay: false })).toEqual({ startHour: 8, endHour: 18 });
	});

	test('leaves a spare hour around the entries', () => {
		expect(
			editorHourRange({ spans: [{ start: 6 * 60 + 30, end: 20 * 60 }], wholeDay: false })
		).toEqual({
			startHour: 5,
			endHour: 21
		});
		expect(editorHourRange({ spans: [{ start: 10 * 60, end: 12 * 60 }], wholeDay: false })).toEqual(
			{
				startHour: 8,
				endHour: 18
			}
		);
	});

	test('can show the whole day', () => {
		expect(editorHourRange({ spans: [], wholeDay: true })).toEqual({ startHour: 0, endHour: 24 });
	});

	test('maps a pointer offset to minutes', () => {
		expect(minutesAtOffset({ offsetPx: 90, hourHeight: 60, startHour: 8 })).toBe(8 * 60 + 90);
		expect(minutesAtOffset({ offsetPx: -50, hourHeight: 60, startHour: 0 })).toBe(0);
	});
});

describe('grid', () => {
	const grid = buildGrid([
		{ id: 'd1', tracks: [{ id: 'a' }, { id: 'b' }] },
		{ id: 'd2', tracks: [] }
	]);

	test('lays days out side by side, a column per track', () => {
		expect(grid.days.map((d) => [d.dayId, d.start, d.width])).toEqual([
			['d1', 0, 2],
			['d2', 2.25, 1]
		]);
		expect(grid.totalUnits).toBe(3.25);
	});

	test('finds the column under a position, the gap going to a neighbour', () => {
		expect(columnAt({ grid, unit: 0.4 })).toMatchObject({ dayId: 'd1', trackId: 'a' });
		expect(columnAt({ grid, unit: 1.9 })).toMatchObject({ dayId: 'd1', trackId: 'b' });
		expect(columnAt({ grid, unit: 2.1 })).toMatchObject({ dayId: 'd1', trackId: 'b' });
		expect(columnAt({ grid, unit: 2.2 })).toMatchObject({ dayId: 'd2', trackId: null });
		expect(columnAt({ grid, unit: 99 })).toMatchObject({ dayId: 'd2' });
		expect(columnAt({ grid: buildGrid([]), unit: 1 })).toBeUndefined();
	});

	test('an entry fills its tracks, or the whole day without any', () => {
		expect(entryExtent({ grid, placement: { dayId: 'd1', trackIds: ['b'] } })).toMatchObject({
			start: 1,
			width: 1
		});
		expect(entryExtent({ grid, placement: { dayId: 'd1', trackIds: [] } })).toEqual({
			start: 0,
			width: 2
		});
		expect(entryExtent({ grid, placement: { dayId: 'd1', trackIds: ['gone'] } })).toEqual({
			start: 0,
			width: 2
		});
		expect(entryExtent({ grid, placement: { dayId: 'nope', trackIds: [] } })).toBeUndefined();
	});

	test('the column under the pointer decides the track', () => {
		const origin = { dayId: 'd1', trackIds: ['a'], unit: 0.5 };
		expect(dropPlacement({ grid, unit: 1.5, origin })).toEqual({ dayId: 'd1', trackIds: ['b'] });
		expect(dropPlacement({ grid, unit: 2.5, origin })).toEqual({ dayId: 'd2', trackIds: [] });
	});
});

describe('tracks spanning several columns', () => {
	const wide = buildGrid([
		{ id: 'd', tracks: [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }] }
	]);

	test('tracks are kept in the day order and without unknown ones', () => {
		expect(normalizeTrackIds({ dayTrackIds: ['a', 'b', 'c'], trackIds: ['c', 'a', 'b'] })).toEqual([
			'a',
			'b',
			'c'
		]);
		expect(normalizeTrackIds({ dayTrackIds: ['a', 'b', 'c'], trackIds: ['c', 'a'] })).toEqual([
			'a',
			'c'
		]);
		expect(normalizeTrackIds({ dayTrackIds: ['a', 'b'], trackIds: ['gone', 'b'] })).toEqual(['b']);
	});

	test('an entry covers from its first to its last track', () => {
		expect(entryExtent({ grid: wide, placement: { dayId: 'd', trackIds: ['b', 'c'] } })).toEqual({
			start: 1,
			width: 2
		});
		expect(entryExtent({ grid: wide, placement: { dayId: 'd', trackIds: ['a', 'c'] } })).toEqual({
			start: 0,
			width: 3
		});
	});

	test('stretching an edge moves it to the pointer and keeps one column', () => {
		const origin = { dayId: 'd', trackIds: ['b', 'c'] };
		expect(stretchTracks({ grid: wide, origin, mode: 'resize-right', unit: 3.5 })).toEqual([
			'b',
			'c',
			'd'
		]);
		expect(stretchTracks({ grid: wide, origin, mode: 'resize-right', unit: 0.2 })).toEqual(['b']);
		expect(stretchTracks({ grid: wide, origin, mode: 'resize-left', unit: 0.2 })).toEqual([
			'a',
			'b',
			'c'
		]);
		expect(stretchTracks({ grid: wide, origin, mode: 'resize-left', unit: 3.5 })).toEqual(['c']);
		// A pointer in the next day cannot pull it out of its own
		expect(stretchTracks({ grid: wide, origin, mode: 'resize-right', unit: 99 })).toEqual([
			'b',
			'c',
			'd'
		]);
	});

	test('stretching over every track names them all', () => {
		expect(
			stretchTracks({
				grid: wide,
				origin: { dayId: 'd', trackIds: ['b'] },
				mode: 'resize-left',
				unit: 0
			})
		).toEqual(['a', 'b']);
		expect(
			stretchTracks({
				grid: wide,
				origin: { dayId: 'd', trackIds: ['a', 'b', 'c'] },
				mode: 'resize-right',
				unit: 3.5
			})
		).toEqual(['a', 'b', 'c', 'd']);
	});

	test('moving keeps the width and the grabbed part under the pointer', () => {
		const origin = { dayId: 'd', trackIds: ['a', 'b'], unit: 1.5 };
		// Grabbed in the second column, dropped over the fourth: it ends on the third and fourth
		expect(dropPlacement({ grid: wide, unit: 3.5, origin })).toEqual({
			dayId: 'd',
			trackIds: ['c', 'd']
		});
		// Dropped over the first: it stays inside the day
		expect(dropPlacement({ grid: wide, unit: 0.5, origin })).toEqual({
			dayId: 'd',
			trackIds: ['a', 'b']
		});
	});

	test('moving into a day with fewer tracks squeezes the entry in', () => {
		const grid = buildGrid([
			{ id: 'd1', tracks: [{ id: 'a' }, { id: 'b' }, { id: 'c' }] },
			{ id: 'd2', tracks: [{ id: 'x' }, { id: 'y' }] }
		]);
		const origin = { dayId: 'd1', trackIds: ['a', 'b'], unit: 0.5 };
		expect(dropPlacement({ grid, unit: 3.5, origin })).toEqual({
			dayId: 'd2',
			trackIds: ['x', 'y']
		});
		const three = { dayId: 'd1', trackIds: ['b', 'c'], unit: 1.5 };
		expect(dropPlacement({ grid, unit: 4.5, origin: three })).toEqual({
			dayId: 'd2',
			trackIds: ['x', 'y']
		});
	});

	test('the keyboard moves or stretches by a column, within the day', () => {
		const origin = { dayId: 'd', trackIds: ['b', 'c'] };
		expect(nudgeTracks({ grid: wide, origin, mode: 'move', direction: 1 })).toEqual(['c', 'd']);
		expect(
			nudgeTracks({
				grid: wide,
				origin: { dayId: 'd', trackIds: ['c', 'd'] },
				mode: 'move',
				direction: 1
			})
		).toEqual(['c', 'd']);
		expect(nudgeTracks({ grid: wide, origin, mode: 'resize-right', direction: 1 })).toEqual([
			'b',
			'c',
			'd'
		]);
		expect(nudgeTracks({ grid: wide, origin, mode: 'resize-right', direction: -1 })).toEqual(['b']);
		expect(
			nudgeTracks({
				grid: wide,
				origin: { dayId: 'd', trackIds: ['b'] },
				mode: 'resize-right',
				direction: -1
			})
		).toEqual(['b']);
	});
});

describe('overlappingIds', () => {
	const entry = (id: string, start: number, end: number, trackIds: string[], dayId = 'd1') => ({
		id,
		dayId,
		trackIds,
		start,
		end
	});

	test('flags entries colliding on a track', () => {
		const ids = overlappingIds([
			entry('a', 540, 600, ['main']),
			entry('b', 570, 660, ['main']),
			entry('c', 570, 660, ['side']),
			entry('d', 660, 720, ['main']),
			entry('e', 700, 710, ['side']),
			entry('f', 540, 600, ['main'], 'd2')
		]);
		expect([...ids].sort()).toEqual(['a', 'b']);
	});

	test('entries spanning several tracks collide where their tracks meet', () => {
		const ids = overlappingIds([
			entry('wide', 540, 600, ['a', 'b']),
			entry('b', 560, 580, ['b']),
			entry('c', 560, 580, ['c'])
		]);
		expect([...ids].sort()).toEqual(['b', 'wide']);
	});
});

describe('assignLanes', () => {
	test('puts overlapping entries of a column side by side', () => {
		const lanes = assignLanes([
			{ id: 'a', dayId: 'd', trackIds: ['t'], start: 540, end: 660 },
			{ id: 'b', dayId: 'd', trackIds: ['t'], start: 600, end: 720 },
			{ id: 'c', dayId: 'd', trackIds: ['t'], start: 660, end: 700 },
			{ id: 'later', dayId: 'd', trackIds: ['t'], start: 800, end: 860 },
			{ id: 'other', dayId: 'd', trackIds: ['u'], start: 540, end: 660 }
		]);
		expect(lanes.get('a')).toEqual({ lane: 0, lanes: 2 });
		expect(lanes.get('b')).toEqual({ lane: 1, lanes: 2 });
		expect(lanes.get('c')).toEqual({ lane: 0, lanes: 2 });
		expect(lanes.get('later')).toEqual({ lane: 0, lanes: 1 });
		expect(lanes.get('other')).toEqual({ lane: 0, lanes: 1 });
	});
});

describe('keyAction', () => {
	test('opens, deletes, moves and stretches', () => {
		expect(keyAction({ key: 'Enter', shift: false })).toEqual({ type: 'open' });
		expect(keyAction({ key: 'Delete', shift: false })).toEqual({ type: 'delete' });
		expect(keyAction({ key: 'ArrowUp', shift: false })).toEqual({
			type: 'nudge',
			mode: 'move',
			axis: 'time',
			direction: -1
		});
		expect(keyAction({ key: 'ArrowDown', shift: true })).toEqual({
			type: 'nudge',
			mode: 'resize',
			axis: 'time',
			direction: 1
		});
		expect(keyAction({ key: 'ArrowRight', shift: false })).toEqual({
			type: 'nudge',
			mode: 'move',
			axis: 'tracks',
			direction: 1
		});
		expect(keyAction({ key: 'ArrowLeft', shift: true })).toEqual({
			type: 'nudge',
			mode: 'resize',
			axis: 'tracks',
			direction: -1
		});
		expect(keyAction({ key: 'a', shift: false })).toBeUndefined();
	});
});
