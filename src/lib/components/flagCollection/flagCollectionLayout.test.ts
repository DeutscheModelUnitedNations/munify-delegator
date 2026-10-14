import { describe, expect, test } from 'vitest';
import {
	compareFlagsByProgress,
	computeGridLayout,
	filterAndSortFlags,
	gridDimensions
} from './flagCollectionLayout';

/** Every grid slot is covered exactly once by the cells. */
function coverage(layout: ReturnType<typeof computeGridLayout<string>>) {
	const slots = new Map<string, number>();
	for (const cell of layout.cells) {
		for (let r = cell.rowStart; r < cell.rowEnd; r++) {
			for (let c = cell.colStart; c < cell.colEnd; c++) {
				slots.set(`${r}/${c}`, (slots.get(`${r}/${c}`) ?? 0) + 1);
			}
		}
	}
	return slots;
}

describe('gridDimensions', () => {
	test.each([
		[1, 1, 1],
		[2, 2, 1],
		[3, 3, 1],
		[4, 2, 2],
		[5, 3, 2],
		[6, 3, 2],
		[10, 4, 3]
	])('%i pieces -> %i x %i', (count, cols, rows) => {
		expect(gridDimensions(count)).toEqual({ cols, rows });
	});
});

describe('computeGridLayout', () => {
	test('no pieces', () => {
		expect(computeGridLayout([])).toEqual({ rows: 1, cols: 1, cells: [] });
	});

	test('a full grid needs no spans', () => {
		const layout = computeGridLayout(['a', 'b', 'c', 'd']);
		expect(layout.cells.map((c) => [c.rowStart, c.colStart, c.colEnd])).toEqual([
			[1, 1, 2],
			[1, 2, 3],
			[2, 1, 2],
			[2, 2, 3]
		]);
	});

	test('leftover cells become double-width spans that cover the grid', () => {
		const pieces = ['a', 'b', 'c', 'd', 'e'];
		const layout = computeGridLayout(pieces);
		expect(layout.rows * layout.cols).toBe(6);
		expect(layout.cells[0]).toEqual({ piece: 'a', rowStart: 1, rowEnd: 2, colStart: 1, colEnd: 3 });
		const slots = coverage(layout);
		expect(slots.size).toBe(6);
		expect([...slots.values()].every((n) => n === 1)).toBe(true);
	});

	test('a span that does not fit wraps to the next row', () => {
		// 7 pieces: 4 x 2 grid with one span, given to piece 0
		const layout = computeGridLayout(['a', 'b', 'c', 'd', 'e', 'f', 'g']);
		expect(layout).toMatchObject({ cols: 4, rows: 2 });
		expect(layout.cells.at(-1)).toMatchObject({ rowStart: 2, colStart: 4 });
		expect(coverage(layout).size).toBe(8);
	});
});

describe('flag sorting and filtering', () => {
	const flags = [
		{ name: 'b', foundPieces: 1, done: false },
		{ name: 'a', foundPieces: 1, done: true },
		{ name: 'c', foundPieces: 3, done: false }
	];

	test('compareFlagsByProgress', () => {
		expect(compareFlagsByProgress(flags[0], flags[2])).toBeGreaterThan(0);
		expect(compareFlagsByProgress(flags[0], flags[1])).toBeGreaterThan(0);
	});

	test('filterAndSortFlags keeps and sorts', () => {
		expect(filterAndSortFlags(flags).map((f) => f.name)).toEqual(['c', 'a', 'b']);
		expect(filterAndSortFlags(flags, (f) => !f.done).map((f) => f.name)).toEqual(['c', 'b']);
		expect(filterAndSortFlags(undefined)).toEqual([]);
	});
});
