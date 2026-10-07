import { describe, expect, it } from 'vitest';
import { DEFAULT_WEIGHTS, assignmentCost, autoAssign } from './autoAssign';
import { assignmentGroups } from './state';
import type { SeatedRole } from './capacity';

const role = (code: string, seats: number): SeatedRole => ({
	key: `nation:${code}`,
	target: { nationAlpha3Code: code, nonStateActorId: null },
	seats
});

const delegation = (id: string, size: number, nationAlpha3Code: string | null = null) => ({
	id,
	nationAlpha3Code,
	nonStateActorId: null,
	members: Array.from({ length: size }, (_, i) => ({ id: `${id}-${i}`, isHeadDelegate: i === 0 }))
});

describe('assignmentCost', () => {
	it('costs a wish its rank and an unwished role the malus', () => {
		expect(assignmentCost(DEFAULT_WEIGHTS, undefined, 1)).toBe(1);
		expect(assignmentCost(DEFAULT_WEIGHTS, undefined, undefined)).toBe(50);
	});

	it('makes good ratings and flags cheaper', () => {
		const review = { evaluation: 5, flagged: true, disqualified: false };
		expect(assignmentCost({ ...DEFAULT_WEIGHTS, markBonus: 1 }, review, 2)).toBe(2 - 1 - 2.5);
	});
});

describe('autoAssign', () => {
	const wishes: Record<string, string[]> = { a: ['FRA', 'GBR'], b: ['FRA'] };

	it('gives the first wish to whoever ranks it best and only fills roles exactly', () => {
		const { groups } = assignmentGroups(
			[delegation('a', 2), delegation('b', 2), delegation('c', 3)],
			[],
			[]
		);
		const result = autoAssign({
			size: 2,
			groups,
			roles: [role('FRA', 2), role('GBR', 2), role('DEU', 3)],
			weights: DEFAULT_WEIGHTS,
			reviewOf: () => undefined,
			wishRankOf: (group, target) => {
				const rank = wishes[group.key]?.indexOf(target.nationAlpha3Code ?? '');
				return rank === undefined || rank < 0 ? undefined : rank + 1;
			}
		});
		expect(result.map(({ group, target }) => [group.key, target.nationAlpha3Code]).sort()).toEqual([
			['a', 'GBR'],
			['b', 'FRA']
		]);
	});

	it('skips disqualified and already assigned groups and filled roles', () => {
		const { groups } = assignmentGroups(
			[delegation('a', 2), delegation('b', 2, 'FRA'), delegation('c', 2)],
			[],
			[]
		);
		const result = autoAssign({
			size: 2,
			groups,
			roles: [role('FRA', 2), role('GBR', 2)],
			weights: DEFAULT_WEIGHTS,
			reviewOf: (group) =>
				group.key === 'c' ? { evaluation: null, flagged: false, disqualified: true } : undefined,
			wishRankOf: () => undefined
		});
		expect(result.map(({ group, target }) => [group.key, target.nationAlpha3Code])).toEqual([
			['a', 'GBR']
		]);
	});
});
