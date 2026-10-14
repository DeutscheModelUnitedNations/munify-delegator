import { describe, expect, test } from 'vitest';
import {
	dayFields,
	parseDayImport,
	entryFields,
	daySortOrder,
	trackFields,
	trackOrderChanges
} from './calendarEditing';

const day = (date: string, sortOrder: number) => ({ date: new Date(date), sortOrder });

describe('daySortOrder', () => {
	test('goes first without other days', () => {
		expect(daySortOrder('2026-03-12', [])).toBe(0);
	});

	test('goes after the last earlier day', () => {
		expect(daySortOrder('2026-03-14', [day('2026-03-12', 0), day('2026-03-13', 1)])).toBe(2);
	});

	test('goes before the first later day when none is earlier', () => {
		expect(daySortOrder('2026-03-10', [day('2026-03-12', 5)])).toBe(4);
	});

	test('goes last when its place between two days is taken', () => {
		const others = [day('2026-03-12', 0), day('2026-03-14', 1)];
		expect(daySortOrder('2026-03-13', others)).toBe(2);
	});

	test('two days on one date still get different orders', () => {
		expect(daySortOrder('2026-03-12', [day('2026-03-12', 0)])).toBe(1);
	});
});

describe('dayFields', () => {
	const others = [day('2026-03-12', 0), day('2026-03-13', 1)];

	test('places a new day by its date', () => {
		const fields = dayFields('Day 3', '2026-03-14', others);
		expect(fields.date.toISOString()).toBe('2026-03-14T00:00:00.000Z');
		expect(fields.sortOrder).toBe(2);
	});

	test('keeps the place of a day that keeps its date', () => {
		expect(dayFields('Renamed', '2026-03-13', [others[0]], others[1]).sortOrder).toBe(1);
	});

	test('moves a day whose date changed', () => {
		expect(dayFields('Day', '2026-03-20', [others[0]], others[1]).sortOrder).toBe(1);
	});
});

describe('trackFields', () => {
	test('stores an empty description as none', () => {
		expect(trackFields('Main', '', 2)).toEqual({ name: 'Main', description: null, sortOrder: 2 });
		expect(trackFields('Main', 'Hall A', 0).description).toBe('Hall A');
	});
});

describe('trackOrderChanges', () => {
	const tracks = [
		{ id: 'a', sortOrder: 0 },
		{ id: 'b', sortOrder: 1 },
		{ id: 'c', sortOrder: 2 }
	];

	test('swaps a track with its neighbour', () => {
		expect(trackOrderChanges(tracks, 'b', -1)).toEqual([
			{ id: 'b', sortOrder: 0 },
			{ id: 'a', sortOrder: 1 }
		]);
		expect(trackOrderChanges(tracks, 'b', 1)).toEqual([
			{ id: 'c', sortOrder: 1 },
			{ id: 'b', sortOrder: 2 }
		]);
	});

	test('does nothing at the ends or for an unknown track', () => {
		expect(trackOrderChanges(tracks, 'a', -1)).toEqual([]);
		expect(trackOrderChanges(tracks, 'c', 1)).toEqual([]);
		expect(trackOrderChanges(tracks, 'x', 1)).toEqual([]);
	});

	test('renumbers tied or gapped sort orders', () => {
		const messy = [
			{ id: 'a', sortOrder: 5 },
			{ id: 'b', sortOrder: 5 },
			{ id: 'c', sortOrder: 9 }
		];
		expect(trackOrderChanges(messy, 'c', -1)).toEqual([
			{ id: 'a', sortOrder: 0 },
			{ id: 'c', sortOrder: 1 },
			{ id: 'b', sortOrder: 2 }
		]);
	});
});

describe('entryFields', () => {
	const form = {
		name: 'Plenum',
		description: '',
		startTime: '09:30',
		endTime: '11:00',
		icon: '',
		color: 'SESSION',
		placeId: null,
		room: '',
		trackIds: [] as string[]
	};

	test('puts the times on the day, and stores empty text as none', () => {
		const fields = entryFields(form, new Date('2026-03-12T00:00:00Z'));
		expect(fields.startTime.toISOString()).toBe('2026-03-12T09:30:00.000Z');
		expect(fields.endTime.toISOString()).toBe('2026-03-12T11:00:00.000Z');
		expect(fields).toMatchObject({
			description: null,
			fontAwesomeIcon: null,
			placeId: null,
			room: null,
			calendarTrackIds: []
		});
	});

	test('keeps what was filled in', () => {
		const fields = entryFields(
			{
				...form,
				description: 'Opening',
				icon: 'gavel',
				room: 'A1',
				placeId: 'p',
				trackIds: ['t', 'u']
			},
			'2026-03-12T00:00:00Z'
		);
		expect(fields).toMatchObject({
			description: 'Opening',
			fontAwesomeIcon: 'gavel',
			room: 'A1',
			placeId: 'p',
			calendarTrackIds: ['t', 'u']
		});
	});
});

describe('parseDayImport', () => {
	test('is no choice without text', () => {
		expect(parseDayImport(null)).toEqual({ data: null, invalid: false });
	});

	test('flags text that is not JSON', () => {
		expect(parseDayImport('nope')).toEqual({ data: null, invalid: true });
	});

	test('flags JSON that is no export', () => {
		expect(parseDayImport('{"a":1}')).toEqual({ data: null, invalid: true });
	});
});
