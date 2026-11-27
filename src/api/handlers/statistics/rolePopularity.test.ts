import { describe, expect, test } from 'vitest';
import {
	rankWeight,
	rolePopularityOf,
	weightedPopularity,
	wishCountsOf,
	type RoleWishRow
} from './rolePopularity';

const wish = (overrides: Partial<RoleWishRow>): RoleWishRow => ({
	roleId: 'deu',
	rank: 1,
	applied: true,
	hasRole: false,
	count: 1,
	...overrides
});

describe('rankWeight', () => {
	test('is 1 / rank', () => {
		expect(rankWeight(1)).toBe(1);
		expect(rankWeight(2)).toBe(0.5);
		expect(rankWeight(4)).toBe(0.25);
	});

	test('counts nothing below rank 1', () => {
		expect(rankWeight(0)).toBe(0);
		expect(rankWeight(-3)).toBe(0);
	});
});

describe('weightedPopularity', () => {
	test('sums the weights of every wish', () => {
		expect(
			weightedPopularity([
				{ rank: 1, count: 2 },
				{ rank: 2, count: 3 },
				{ rank: 4, count: 4 }
			])
		).toBe(2 + 1.5 + 1);
	});

	test('is 0 without wishes', () => {
		expect(weightedPopularity([])).toBe(0);
	});
});

describe('wishCountsOf', () => {
	const wishes = [
		wish({ rank: 1, count: 2 }),
		wish({ rank: 2, count: 1 }),
		wish({ rank: 3, count: 1 }),
		wish({ rank: 4, count: 1 }),
		wish({ rank: 7, count: 2 }),
		wish({ rank: 1, applied: false, count: 5 }),
		wish({ rank: 2, applied: true, hasRole: true, count: 1 })
	];

	test('counts per rank, folding the fourth and later wishes together', () => {
		const { weightedPopularity: weighted, ...counts } = wishCountsOf({ wishes, filter: 'ALL' });
		expect(counts).toEqual({
			applications: 13,
			firstChoice: 7,
			secondChoice: 2,
			thirdChoice: 1,
			laterChoice: 3
		});
		expect(weighted).toBeCloseTo(7 + 1 + 1 / 3 + 1 / 4 + 2 / 7);
	});

	test('counts only the delegations the filter selects', () => {
		expect(wishCountsOf({ wishes, filter: 'APPLIED' })).toMatchObject({
			applications: 8,
			firstChoice: 2,
			secondChoice: 2
		});
		expect(wishCountsOf({ wishes, filter: 'NOT_APPLIED' })).toMatchObject({
			applications: 5,
			firstChoice: 5,
			weightedPopularity: 5
		});
		expect(wishCountsOf({ wishes, filter: 'APPLIED_WITH_ROLE' })).toMatchObject({
			applications: 1,
			secondChoice: 1,
			weightedPopularity: 0.5
		});
	});
});

describe('rolePopularityOf', () => {
	const nation = (id: string) => ({ id, kind: 'NATION' as const, seatAmount: null });
	const committees = [
		{ numOfSeatsPerDelegation: 1, roles: [{ id: 'deu' }, { id: 'fra' }, { id: 'usa' }] },
		{ numOfSeatsPerDelegation: 2, roles: [{ id: 'usa' }] }
	];

	test('lists every role, also those nobody wished for, with its seats', () => {
		const rows = rolePopularityOf({
			roles: [nation('deu'), nation('fra'), nation('usa'), nation('ita')],
			committees,
			wishes: [wish({ roleId: 'deu', rank: 1 })],
			filter: 'ALL'
		});
		expect(rows.map((row) => [row.role.id, row.seats, row.applications])).toEqual([
			['ita', 0, 0],
			['fra', 1, 0],
			['deu', 1, 1],
			['usa', 3, 0]
		]);
	});

	test('takes a non-state actor’s seats from its seat amount', () => {
		const [row] = rolePopularityOf({
			roles: [{ id: 'nsa', kind: 'NON_STATE_ACTOR', seatAmount: 2 }],
			committees,
			wishes: [wish({ roleId: 'nsa', rank: 2 })],
			filter: 'ALL'
		});
		expect(row).toMatchObject({ seats: 2, applications: 1, secondChoice: 1 });
	});

	test('sorts by seats, then least popular first', () => {
		const rows = rolePopularityOf({
			roles: [nation('deu'), nation('fra')],
			committees,
			wishes: [
				wish({ roleId: 'deu', rank: 1 }),
				wish({ roleId: 'fra', rank: 1 }),
				wish({ roleId: 'fra', rank: 2 })
			],
			filter: 'ALL'
		});
		expect(rows.map((row) => row.role.id)).toEqual(['deu', 'fra']);
	});
});
