import { describe, expect, test } from 'vitest';
import {
	nextPopularitySort,
	popularityRowsOf,
	seatCountsOf,
	type PopularityRow
} from './rolePopularityTable';

const row = (roleId: string, overrides: Partial<PopularityRow>): PopularityRow => ({
	roleId,
	seats: 1,
	applications: 0,
	firstChoice: 0,
	secondChoice: 0,
	thirdChoice: 0,
	laterChoice: 0,
	weightedPopularity: 0,
	...overrides
});

// In the server's order: by seats, then least popular first.
const rows = [
	row('ita', { seats: 1, weightedPopularity: 0 }),
	row('deu', { seats: 1, applications: 3, weightedPopularity: 2 }),
	row('fra', { seats: 2, applications: 1, weightedPopularity: 0.5 }),
	row('usa', { seats: 2, applications: 4, weightedPopularity: 3 })
];
const nameOf = (r: PopularityRow) => r.roleId;
const ids = (list: PopularityRow[]) => list.map((r) => r.roleId);

describe('seatCountsOf', () => {
	test('lists each seat count once, smallest first', () => {
		expect(seatCountsOf([{ seats: 3 }, { seats: 1 }, { seats: 3 }])).toEqual([1, 3]);
	});
});

describe('popularityRowsOf', () => {
	test('keeps the server order without a sort', () => {
		expect(ids(popularityRowsOf({ rows, seats: undefined, sort: undefined, nameOf }))).toEqual([
			'ita',
			'deu',
			'fra',
			'usa'
		]);
	});

	test('narrows to one seat count, least popular first', () => {
		expect(ids(popularityRowsOf({ rows, seats: 2, sort: undefined, nameOf }))).toEqual([
			'fra',
			'usa'
		]);
	});

	test('sorts across all seat counts', () => {
		expect(
			ids(
				popularityRowsOf({
					rows,
					seats: undefined,
					sort: { key: 'weightedPopularity', descending: false },
					nameOf
				})
			)
		).toEqual(['ita', 'fra', 'deu', 'usa']);
		expect(
			ids(
				popularityRowsOf({
					rows,
					seats: undefined,
					sort: { key: 'applications', descending: true },
					nameOf
				})
			)
		).toEqual(['usa', 'deu', 'fra', 'ita']);
	});

	test('sorts by name', () => {
		expect(
			ids(
				popularityRowsOf({
					rows,
					seats: undefined,
					sort: { key: 'name', descending: false },
					nameOf
				})
			)
		).toEqual(['deu', 'fra', 'ita', 'usa']);
	});
});

describe('nextPopularitySort', () => {
	test('cycles ascending, descending, default', () => {
		const first = nextPopularitySort({ current: undefined, key: 'seats' });
		expect(first).toEqual({ key: 'seats', descending: false });
		const second = nextPopularitySort({ current: first, key: 'seats' });
		expect(second).toEqual({ key: 'seats', descending: true });
		expect(nextPopularitySort({ current: second, key: 'seats' })).toBeUndefined();
	});

	test('starts ascending on another column', () => {
		expect(
			nextPopularitySort({ current: { key: 'seats', descending: true }, key: 'name' })
		).toEqual({ key: 'name', descending: false });
	});
});
