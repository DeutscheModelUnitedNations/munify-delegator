import { describe, expect, test } from 'vitest';
import { hasWishesOfKind, roleWishChart, type RoleWishes } from './roleWishChart';

const labels = {
	role: (role: RoleWishes) => role.nationAlpha3Code ?? role.name ?? '',
	rank: (rank: number) => `#${rank}`,
	roles: 'Roles',
	ranks: 'Ranks',
	delegations: 'Delegations',
	granted: 'Got it',
	notGranted: 'Did not'
};

const role = (overrides: Partial<RoleWishes>): RoleWishes => ({
	roleId: 'deu',
	kind: 'NATION',
	nationAlpha3Code: 'DEU',
	name: null,
	total: 0,
	granted: 0,
	byRank: [],
	...overrides
});

describe('roleWishChart', () => {
	test('puts roles along x, wish places in depth and splits each bar by who got the role', () => {
		const chart = roleWishChart({
			roles: [
				role({
					total: 5,
					granted: 1,
					byRank: [
						{ rank: 1, count: 3, granted: 1 },
						{ rank: 3, count: 2, granted: 0 }
					]
				}),
				role({
					roleId: 'fra',
					nationAlpha3Code: 'FRA',
					total: 1,
					byRank: [{ rank: 2, count: 1, granted: 0 }]
				})
			],
			kind: 'NATION',
			labels
		});
		expect(chart.xLabels).toEqual(['DEU', 'FRA']);
		expect(chart.yLabels).toEqual(['#1', '#2', '#3']);
		expect(chart.series.map((series) => series.name)).toEqual(['Got it', 'Did not']);
		expect(chart.series[0]?.data).toEqual([
			{ x: 0, y: 0, value: 1 },
			{ x: 0, y: 2, value: 0 },
			{ x: 1, y: 1, value: 0 }
		]);
		expect(chart.series[1]?.data).toEqual([
			{ x: 0, y: 0, value: 2 },
			{ x: 0, y: 2, value: 2 },
			{ x: 1, y: 1, value: 1 }
		]);
	});

	test('shows only the kind asked for, at most `limit` roles, in the given order', () => {
		const roles = [
			role({ roleId: 'a', nationAlpha3Code: 'AAA' }),
			role({ roleId: 'nsa', kind: 'NON_STATE_ACTOR', nationAlpha3Code: null, name: 'NGO' }),
			role({ roleId: 'b', nationAlpha3Code: 'BBB' }),
			role({ roleId: 'c', nationAlpha3Code: 'CCC' })
		];
		expect(roleWishChart({ roles, kind: 'NATION', limit: 2, labels }).xLabels).toEqual([
			'AAA',
			'BBB'
		]);
		expect(roleWishChart({ roles, kind: 'NON_STATE_ACTOR', labels }).xLabels).toEqual(['NGO']);
	});

	test('has no wish places without wishes', () => {
		expect(roleWishChart({ roles: [], kind: 'NATION', labels }).yLabels).toEqual([]);
	});
});

describe('hasWishesOfKind', () => {
	test('is true only when a role of the kind was wished for', () => {
		const roles = [role({ total: 2 }), role({ kind: 'NON_STATE_ACTOR', total: 0 })];
		expect(hasWishesOfKind({ roles, kind: 'NATION' })).toBe(true);
		expect(hasWishesOfKind({ roles, kind: 'NON_STATE_ACTOR' })).toBe(false);
	});
});
