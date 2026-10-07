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
	it('costs a wish its rank', () => {
		expect(assignmentCost(DEFAULT_WEIGHTS, undefined, 1)).toBe(1);
	});

	it('squares the rank so a far pick costs more than several near ones', () => {
		expect(assignmentCost(DEFAULT_WEIGHTS, undefined, 3)).toBe(9);
		expect(assignmentCost(DEFAULT_WEIGHTS, undefined, 3)).toBeGreaterThan(
			2 * assignmentCost(DEFAULT_WEIGHTS, undefined, 2)
		);
	});

	it('lets a good rating weigh the wish more', () => {
		const rated = (evaluation: number) => ({ evaluation, flagged: false, disqualified: false });
		const weights = DEFAULT_WEIGHTS;
		expect(
			assignmentCost(weights, rated(5), 4) - assignmentCost(weights, rated(5), 1)
		).toBeGreaterThan(assignmentCost(weights, rated(1), 4) - assignmentCost(weights, rated(1), 1));
	});

	it('makes good ratings and flags cheaper', () => {
		const review = { evaluation: 5, flagged: true, disqualified: false };
		expect(assignmentCost({ ...DEFAULT_WEIGHTS, markBonus: 1, ratingFactor: 0 }, review, 2)).toBe(
			3
		);
		expect(assignmentCost(DEFAULT_WEIGHTS, review, 1)).toBeLessThan(
			assignmentCost(DEFAULT_WEIGHTS, { ...review, evaluation: 1 }, 1)
		);
	});
});

describe('flags', () => {
	const flagged = { evaluation: null, flagged: true, disqualified: false };
	const weights = (markBonus: number, markEffect = DEFAULT_WEIGHTS.markEffect) => ({
		...DEFAULT_WEIGHTS,
		markBonus,
		markEffect
	});
	const slope = (w: ReturnType<typeof weights>, review: typeof flagged | undefined) =>
		assignmentCost(w, review, 4) - assignmentCost(w, review, 1);

	it('only shifts the cost by default, leaving the weight of the wishes alone', () => {
		expect(DEFAULT_WEIGHTS.markEffect).toBe('SEATING_ONLY');
		expect(assignmentCost(weights(2), flagged, 2)).toBe(
			assignmentCost(weights(2), undefined, 2) - 2
		);
		expect(slope(weights(2), flagged)).toBe(slope(weights(2), undefined));
	});

	it('also weighs the wishes of flagged groups when asked to', () => {
		const w = weights(2, 'WISHES_AND_SEATING');
		expect(slope(w, flagged)).toBeGreaterThan(slope(w, undefined));
		expect(slope(weights(-2, 'WISHES_AND_SEATING'), flagged)).toBeLessThan(
			slope(weights(-2, 'WISHES_AND_SEATING'), undefined)
		);
	});

	it('does not touch groups that are not flagged', () => {
		const unflagged = { ...flagged, flagged: false };
		expect(assignmentCost(weights(2, 'WISHES_AND_SEATING'), unflagged, 3)).toBe(
			assignmentCost(weights(0), unflagged, 3)
		);
	});

	describe('when assigning', () => {
		// Both groups rank FRA first and GBR second, so who gets FRA is up to the weights.
		const run = (w: ReturnType<typeof weights>, roles = [role('FRA', 2), role('GBR', 2)]) => {
			const { groups } = assignmentGroups([delegation('flag', 2), delegation('plain', 2)], [], []);
			const result = autoAssign({
				size: 2,
				groups,
				roles,
				weights: w,
				reviewOf: (group) => (group.key === 'flag' ? flagged : undefined),
				wishRankOf: (_group, target) => (target.nationAlpha3Code === 'FRA' ? 1 : 2)
			});
			return new Map(result.map(({ group, target }) => [group.key, target.nationAlpha3Code]));
		};

		it('gives the contested role to the flagged group when flags weigh the wishes', () => {
			const result = run(weights(4, 'WISHES_AND_SEATING'));
			expect(result.get('flag')).toBe('FRA');
			expect(result.get('plain')).toBe('GBR');
		});

		it('gives it to the other group when a negative bonus weighs the wishes', () => {
			const result = run(weights(-4, 'WISHES_AND_SEATING'));
			expect(result.get('plain')).toBe('FRA');
			expect(result.get('flag')).toBe('GBR');
		});

		it('seats the flagged group first when a role is short, in both modes', () => {
			for (const markEffect of ['WISHES_AND_SEATING', 'SEATING_ONLY'] as const) {
				expect([...run(weights(4, markEffect), [role('FRA', 2)]).keys()]).toEqual(['flag']);
				expect([...run(weights(-4, markEffect), [role('FRA', 2)]).keys()]).toEqual(['plain']);
			}
		});

		it('keeps both groups seated when flags only affect seating and roles suffice', () => {
			expect(run(weights(4, 'SEATING_ONLY')).size).toBe(2);
		});
	});
});

describe('experience', () => {
	const weights = (
		experienceModifier: number,
		experienceEffect = DEFAULT_WEIGHTS.experienceEffect
	) => ({
		...DEFAULT_WEIGHTS,
		experienceModifier,
		experienceEffect
	});

	it('does nothing with the default weights', () => {
		expect(assignmentCost(DEFAULT_WEIGHTS, undefined, 2, 1)).toBe(
			assignmentCost(DEFAULT_WEIGHTS, undefined, 2, 0)
		);
	});

	it('charges the modifier scaled by the share of experienced members', () => {
		const base = assignmentCost(weights(0, 'SEATING_ONLY'), undefined, 2);
		expect(assignmentCost(weights(3, 'SEATING_ONLY'), undefined, 2, 1)).toBe(base + 3);
		expect(assignmentCost(weights(3, 'SEATING_ONLY'), undefined, 2, 0.5)).toBe(base + 1.5);
		expect(assignmentCost(weights(-3, 'SEATING_ONLY'), undefined, 2, 1)).toBe(base - 3);
	});

	it('weighs the wishes less for experienced groups when asked to', () => {
		const slope = (w: ReturnType<typeof weights>, experience: number) =>
			assignmentCost(w, undefined, 4, experience) - assignmentCost(w, undefined, 1, experience);
		expect(slope(weights(4), 1)).toBeLessThan(slope(weights(4), 0));
		expect(slope(weights(-4), 1)).toBeGreaterThan(slope(weights(-4), 0));
	});

	it('keeps the wishes at the same weight when it only affects seating', () => {
		const w = weights(4, 'SEATING_ONLY');
		const slope = (experience: number) =>
			assignmentCost(w, undefined, 4, experience) - assignmentCost(w, undefined, 1, experience);
		expect(slope(1)).toBe(slope(0));
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
			wishRankOf: () => 1
		});
		expect(result.map(({ group, target }) => [group.key, target.nationAlpha3Code])).toEqual([
			['a', 'GBR']
		]);
	});

	it('gives leftover roles to groups without a wish, after the wishes', () => {
		const { groups } = assignmentGroups([delegation('a', 2)], [], []);
		const base = {
			size: 2,
			groups,
			roles: [role('FRA', 2)],
			weights: DEFAULT_WEIGHTS,
			reviewOf: () => undefined,
			wishRankOf: () => undefined
		};
		expect(autoAssign(base)).toHaveLength(1);
	});

	it('seats as many groups on their wishes as possible', () => {
		const { groups } = assignmentGroups([delegation('a', 2), delegation('b', 2)], [], []);
		const result = autoAssign({
			size: 2,
			groups,
			roles: [role('FRA', 2), role('GBR', 2)],
			weights: DEFAULT_WEIGHTS,
			reviewOf: () => undefined,
			// both want FRA, only a also wants GBR: a must yield FRA so both are seated
			wishRankOf: (group, target) =>
				target.nationAlpha3Code === 'FRA'
					? group.key === 'a'
						? 1
						: 3
					: group.key === 'a'
						? 20
						: undefined
		});
		expect(result.map(({ group, target }) => [group.key, target.nationAlpha3Code]).sort()).toEqual([
			['a', 'GBR'],
			['b', 'FRA']
		]);
	});

	it("weighs a well-rated group's wish higher in a contest", () => {
		const { groups } = assignmentGroups([delegation('a', 2), delegation('b', 2)], [], []);
		const result = autoAssign({
			size: 2,
			groups,
			roles: [role('FRA', 2), role('GBR', 2)],
			weights: DEFAULT_WEIGHTS,
			reviewOf: (group) => ({
				evaluation: group.key === 'a' ? 5 : 1,
				flagged: false,
				disqualified: false
			}),
			// a: FRA 1st, GBR 2nd; b: FRA 1st, GBR 2nd - a symmetrical contest the rating decides
			wishRankOf: (_group, target) => (target.nationAlpha3Code === 'FRA' ? 1 : 2)
		});
		expect(result.find(({ group }) => group.key === 'a')?.target.nationAlpha3Code).toBe('FRA');
	});

	it('breaks ties the same way for the same seed regardless of input order', () => {
		const { groups } = assignmentGroups([delegation('a', 2), delegation('b', 2)], [], []);
		const run = (list: typeof groups) =>
			autoAssign({
				size: 2,
				groups: list,
				roles: [role('FRA', 2)],
				weights: DEFAULT_WEIGHTS,
				reviewOf: () => undefined,
				wishRankOf: () => 1,
				seed: 'x'
			}).map(({ group }) => group.key);
		expect(run(groups)).toEqual(run([...groups].reverse()));
	});

	describe('with experience', () => {
		// Both groups rank FRA first and GBR second, so who gets FRA is up to the weights.
		const run = (
			weights: typeof DEFAULT_WEIGHTS,
			roles = [role('FRA', 2), role('GBR', 2)],
			seed = ''
		) => {
			const { groups } = assignmentGroups([delegation('vet', 2), delegation('new', 2)], [], []);
			const result = autoAssign({
				size: 2,
				groups,
				roles,
				weights,
				seed,
				reviewOf: () => undefined,
				experienceOf: (group) => (group.key === 'vet' ? 1 : 0),
				wishRankOf: (_group, target) => (target.nationAlpha3Code === 'FRA' ? 1 : 2)
			});
			return new Map(result.map(({ group, target }) => [group.key, target.nationAlpha3Code]));
		};

		it('lets newcomers win a contested role when experience counts against', () => {
			const result = run({ ...DEFAULT_WEIGHTS, experienceModifier: 4 });
			expect(result.get('new')).toBe('FRA');
			expect(result.get('vet')).toBe('GBR');
		});

		it('lets experienced groups win it when experience counts in favour', () => {
			const result = run({ ...DEFAULT_WEIGHTS, experienceModifier: -4 });
			expect(result.get('vet')).toBe('FRA');
			expect(result.get('new')).toBe('GBR');
		});

		it('leaves the contest to the tie-break when it only affects seating', () => {
			// Both groups get a role either way, so a flat cost per group cannot change the total.
			const weights = {
				...DEFAULT_WEIGHTS,
				experienceModifier: 4,
				experienceEffect: 'SEATING_ONLY' as const
			};
			const result = run(weights);
			expect(result.size).toBe(2);
			expect(result.get('vet')).toBe(run(weights).get('vet'));
		});

		it('leaves the experienced group out first when there is one role short', () => {
			for (const experienceEffect of ['WISHES_AND_SEATING', 'SEATING_ONLY'] as const) {
				const result = run({ ...DEFAULT_WEIGHTS, experienceModifier: 4, experienceEffect }, [
					role('FRA', 2)
				]);
				expect([...result.keys()]).toEqual(['new']);
			}
		});

		it('leaves newcomers out first when experience is rewarded', () => {
			const result = run({ ...DEFAULT_WEIGHTS, experienceModifier: -4 }, [role('FRA', 2)]);
			expect([...result.keys()]).toEqual(['vet']);
		});
	});
});
