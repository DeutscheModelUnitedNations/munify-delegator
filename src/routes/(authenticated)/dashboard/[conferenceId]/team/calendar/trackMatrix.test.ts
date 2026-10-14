import { describe, expect, test } from 'vitest';
import { rowOrderChanges, trackRows, type MatrixDay } from './trackMatrix';

const track = (id: string, name: string, sortOrder: number, description: string | null = null) => ({
	id,
	name,
	description,
	sortOrder,
	entries: []
});

const day = (id: string, tracks: MatrixDay['tracks']): MatrixDay => ({
	id,
	name: id,
	date: new Date('2026-01-01T00:00:00Z'),
	sortOrder: 0,
	entries: [],
	tracks
});

describe('trackRows', () => {
	test('lists each name once, by the lowest sort order it has', () => {
		const days = [
			day('d1', [track('a1', 'A', 2), track('b1', 'B', 1)]),
			day('d2', [track('a2', 'A', 0), track('c2', 'C', 5)])
		];
		expect(trackRows(days).map((row) => row.name)).toEqual(['A', 'B', 'C']);
	});

	test('takes the first description found', () => {
		const days = [
			day('d1', [track('a1', 'A', 0)]),
			day('d2', [track('a2', 'A', 0, 'later')]),
			day('d3', [track('a3', 'A', 0, 'last')])
		];
		expect(trackRows(days)).toEqual([{ name: 'A', description: 'later' }]);
	});
});

describe('rowOrderChanges', () => {
	const days = [
		day('d1', [track('a1', 'A', 0), track('b1', 'B', 1), track('c1', 'C', 2)]),
		day('d2', [track('a2', 'A', 0)])
	];
	const rows = trackRows(days);

	test('renumbers the tracks of the rows that moved', () => {
		const changes = rowOrderChanges(days, rows, 'C', 0);
		expect(changes).toEqual([
			{ id: 'a1', sortOrder: 1 },
			{ id: 'b1', sortOrder: 2 },
			{ id: 'c1', sortOrder: 0 },
			{ id: 'a2', sortOrder: 1 }
		]);
	});

	test('changes nothing for an unknown row, a no-op or an out-of-range drop', () => {
		expect(rowOrderChanges(days, rows, 'X', 0)).toEqual([]);
		expect(rowOrderChanges(days, rows, 'A', 0)).toEqual([]);
		expect(rowOrderChanges(days, rows, 'A', -1)).toEqual([]);
		expect(rowOrderChanges(days, rows, 'A', 3)).toEqual([]);
	});
});
