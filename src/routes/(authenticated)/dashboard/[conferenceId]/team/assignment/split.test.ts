import { describe, expect, it } from 'vitest';
import { evenDivisions, initialParts, partsOf, quickSplit, withoutPart } from './split';

const ids = ['a', 'b', 'c', 'd', 'e', 'f'];

describe('split', () => {
	it('starts with the first member on their own', () => {
		expect(initialParts(['a', 'b', 'c'])).toEqual({ a: 0, b: 1, c: 1 });
	});

	it('offers the part counts that divide the members evenly', () => {
		expect(evenDivisions(6)).toEqual([2, 3, 6]);
		expect(evenDivisions(12)).toEqual([2, 3, 4, 6]);
		expect(evenDivisions(1)).toEqual([]);
	});

	it('splits into equally sized parts in member order', () => {
		expect(quickSplit(ids, 3)).toEqual({ a: 0, b: 0, c: 1, d: 1, e: 2, f: 2 });
	});

	it('moves the members of a dropped part into the one before it', () => {
		const partOf = { a: 0, b: 1, c: 2, d: 3 };
		expect(withoutPart(partOf, 2)).toEqual({ a: 0, b: 1, c: 1, d: 2 });
	});

	it('moves the members of the dropped first part into the one after it', () => {
		expect(withoutPart({ a: 0, b: 1, c: 2 }, 0)).toEqual({ a: 0, b: 0, c: 1 });
	});

	it('lists the members of each part, empty parts included', () => {
		const members = ids.slice(0, 3).map((id) => ({ id }));
		expect(partsOf(members, { a: 2, b: 0, c: 2 }, 3)).toEqual([
			[{ id: 'b' }],
			[],
			[{ id: 'a' }, { id: 'c' }]
		]);
	});
});
