import { describe, expect, test } from 'vitest';
import { defaultDescending, nextSortParams, sortSeatRows } from './sortRows';

const rows = [
	{
		name: 'Frankreich',
		alpha3Code: 'fra',
		regionalGroup: 'Western European and Others Group' as const
	},
	{ name: 'Ägypten', alpha3Code: 'egy', regionalGroup: 'African Group' as const },
	{ name: 'China', alpha3Code: 'chn', regionalGroup: 'Asia and the Pacific Group' as const },
	{ name: 'Angola', alpha3Code: 'ago', regionalGroup: 'African Group' as const }
];

const sizes: Record<string, number> = { fra: 5, egy: 4, chn: 5, ago: 0 };
const gv = new Set(['fra', 'ago']);
const seats = {
	size: (alpha3Code: string) => sizes[alpha3Code] ?? 0,
	hasSeat: (committeeId: string, alpha3Code: string) => committeeId === 'gv' && gv.has(alpha3Code)
};

const names = (sorted: typeof rows) => sorted.map((row) => row.name);

describe('sortSeatRows', () => {
	test('sorts by name with the locale (umlauts next to their base letter)', () => {
		expect(names(sortSeatRows(rows, { key: 'name', descending: false }, seats))).toEqual([
			'Ägypten',
			'Angola',
			'China',
			'Frankreich'
		]);
		expect(names(sortSeatRows(rows, { key: 'name', descending: true }, seats))[0]).toBe(
			'Frankreich'
		);
	});

	test('sorts by regional group in the order of the former grouped view, then by name', () => {
		expect(names(sortSeatRows(rows, { key: 'group', descending: false }, seats))).toEqual([
			'Ägypten',
			'Angola',
			'China',
			'Frankreich'
		]);
	});

	test('sorts by delegation size, ties by name ascending even when descending', () => {
		expect(names(sortSeatRows(rows, { key: 'size', descending: true }, seats))).toEqual([
			'China',
			'Frankreich',
			'Ägypten',
			'Angola'
		]);
	});

	test('sorts by seat in a committee', () => {
		expect(names(sortSeatRows(rows, { key: 'gv', descending: true }, seats))).toEqual([
			'Angola',
			'Frankreich',
			'Ägypten',
			'China'
		]);
	});

	test('does not mutate the input', () => {
		const copy = [...rows];
		sortSeatRows(rows, { key: 'size', descending: true }, seats);
		expect(rows).toEqual(copy);
	});
});

describe('defaultDescending', () => {
	test('text columns start ascending, numbers and seats descending', () => {
		expect(defaultDescending('name')).toBe(false);
		expect(defaultDescending('group')).toBe(false);
		expect(defaultDescending('size')).toBe(true);
		expect(defaultDescending('committee-id')).toBe(true);
	});
});

describe('nextSortParams', () => {
	test('a new column starts with its default direction', () => {
		expect(nextSortParams({ sort: null, desc: null }, 'size')).toEqual({
			sort: 'size',
			desc: true
		});
		expect(nextSortParams({ sort: 'size', desc: true }, 'group')).toEqual({
			sort: 'group',
			desc: null
		});
	});

	test('the active column flips, defaults are left out of the URL', () => {
		expect(nextSortParams({ sort: null, desc: null }, 'name')).toEqual({ sort: null, desc: true });
		expect(nextSortParams({ sort: null, desc: true }, 'name')).toEqual({ sort: null, desc: null });
		expect(nextSortParams({ sort: 'size', desc: true }, 'size')).toEqual({
			sort: 'size',
			desc: null
		});
	});
});
