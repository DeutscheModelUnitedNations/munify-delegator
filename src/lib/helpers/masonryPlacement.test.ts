import { describe, expect, it } from 'vitest';
import { masonryPlacement } from './masonryPlacement';

const heights = (...values: number[]) => values.map((height) => ({ height }));
const columnsOf = (places: { column: number }[]) => places.map(({ column }) => column);

describe('masonryPlacement', () => {
	it('fills the columns from left to right and stacks them with the gap', () => {
		expect(masonryPlacement({ items: heights(100, 100, 100, 50), columns: 3, gap: 16 })).toEqual([
			{ column: 0, top: 0 },
			{ column: 1, top: 0 },
			{ column: 2, top: 0 },
			{ column: 0, top: 116 }
		]);
	});

	it('puts an item below the column that ends highest', () => {
		const places = masonryPlacement({
			items: heights(100, 310, 100, 100, 100),
			columns: 2,
			gap: 0
		});
		expect(places.slice(2)).toEqual([
			{ column: 0, top: 100 },
			{ column: 0, top: 200 },
			{ column: 0, top: 300 }
		]);
	});

	it('keeps the reading order within the tolerance', () => {
		const items = heights(104, 125, 104, 104, 217, 104);
		expect(columnsOf(masonryPlacement({ items, columns: 3, gap: 16, tolerance: 24 }))).toEqual([
			0, 1, 2, 0, 1, 2
		]);
		expect(columnsOf(masonryPlacement({ items, columns: 3, gap: 16 }))).toEqual([0, 1, 2, 0, 2, 1]);
	});

	it('skips a column that ends too far down', () => {
		const items = heights(104, 217, 104, 104, 104, 104);
		expect(columnsOf(masonryPlacement({ items, columns: 3, gap: 16, tolerance: 24 }))).toEqual([
			0, 1, 2, 0, 2, 0
		]);
	});

	it('puts a full-width item below everything and starts over after it', () => {
		expect(
			masonryPlacement({
				items: [{ height: 100 }, { height: 40 }, { height: 20, fullWidth: true }, { height: 10 }],
				columns: 2,
				gap: 10
			})
		).toEqual([
			{ column: 0, top: 0 },
			{ column: 1, top: 0 },
			{ column: 0, top: 110 },
			{ column: 0, top: 140 }
		]);
	});

	it('stacks everything in a single column', () => {
		expect(masonryPlacement({ items: heights(10, 20, 30), columns: 1, gap: 5 })).toEqual([
			{ column: 0, top: 0 },
			{ column: 0, top: 15 },
			{ column: 0, top: 40 }
		]);
	});

	it('places nothing when there is nothing', () => {
		expect(masonryPlacement({ items: [], columns: 3, gap: 16 })).toEqual([]);
	});
});
