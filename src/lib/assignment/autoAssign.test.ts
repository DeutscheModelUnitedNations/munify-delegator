import { describe, expect, it, it as test } from 'vitest';
import { DEFAULT_WEIGHTS, assignmentCost, autoAssign, autoAssignSingles } from './autoAssign';
import { assignmentGroups } from './state';
import type { SeatedRole } from './capacity';

const role = (roleId: string, seats: number): SeatedRole => ({
	key: roleId,
	target: { roleId },
	seats
});

const delegation = (id: string, size: number, roleId: string | null = null) => ({
	id,
	roleId,
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
		const run = (
			w: ReturnType<typeof weights>,
			roles = [role('nation-fra', 2), role('nation-gbr', 2)]
		) => {
			const { groups } = assignmentGroups([delegation('flag', 2), delegation('plain', 2)], [], []);
			const result = autoAssign({
				size: 2,
				groups,
				roles,
				weights: w,
				reviewOf: (group) => (group.key === 'flag' ? flagged : undefined),
				wishRankOf: (_group, target) => (target.roleId === 'nation-fra' ? 1 : 2)
			});
			return new Map(result.map(({ group, target }) => [group.key, target.roleId]));
		};

		it('gives the contested role to the flagged group when flags weigh the wishes', () => {
			const result = run(weights(4, 'WISHES_AND_SEATING'));
			expect(result.get('flag')).toBe('nation-fra');
			expect(result.get('plain')).toBe('nation-gbr');
		});

		it('gives it to the other group when a negative bonus weighs the wishes', () => {
			const result = run(weights(-4, 'WISHES_AND_SEATING'));
			expect(result.get('plain')).toBe('nation-fra');
			expect(result.get('flag')).toBe('nation-gbr');
		});

		it('seats the flagged group first when a role is short, in both modes', () => {
			for (const markEffect of ['WISHES_AND_SEATING', 'SEATING_ONLY'] as const) {
				expect([...run(weights(4, markEffect), [role('nation-fra', 2)]).keys()]).toEqual(['flag']);
				expect([...run(weights(-4, markEffect), [role('nation-fra', 2)]).keys()]).toEqual([
					'plain'
				]);
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
	const wishes: Record<string, string[]> = { a: ['nation-fra', 'nation-gbr'], b: ['nation-fra'] };

	it('gives the first wish to whoever ranks it best and only fills roles exactly', () => {
		const { groups } = assignmentGroups(
			[delegation('a', 2), delegation('b', 2), delegation('c', 3)],
			[],
			[]
		);
		const result = autoAssign({
			size: 2,
			groups,
			roles: [role('nation-fra', 2), role('nation-gbr', 2), role('nation-deu', 3)],
			weights: DEFAULT_WEIGHTS,
			reviewOf: () => undefined,
			wishRankOf: (group, target) => {
				const rank = wishes[group.key]?.indexOf(target.roleId ?? '');
				return rank === undefined || rank < 0 ? undefined : rank + 1;
			}
		});
		expect(result.map(({ group, target }) => [group.key, target.roleId]).sort()).toEqual([
			['a', 'nation-gbr'],
			['b', 'nation-fra']
		]);
	});

	it('skips disqualified and already assigned groups and filled roles', () => {
		const { groups } = assignmentGroups(
			[delegation('a', 2), delegation('b', 2, 'nation-fra'), delegation('c', 2)],
			[],
			[]
		);
		const result = autoAssign({
			size: 2,
			groups,
			roles: [role('nation-fra', 2), role('nation-gbr', 2)],
			weights: DEFAULT_WEIGHTS,
			reviewOf: (group) =>
				group.key === 'c' ? { evaluation: null, flagged: false, disqualified: true } : undefined,
			wishRankOf: () => 1
		});
		expect(result.map(({ group, target }) => [group.key, target.roleId])).toEqual([
			['a', 'nation-gbr']
		]);
	});

	it('seats a required group before better-rated ones, even on a role it did not wish for', () => {
		const { groups } = assignmentGroups(
			[delegation('star', 2), delegation('good', 2), delegation('must', 2)],
			[],
			[]
		);
		const result = autoAssign({
			size: 2,
			groups,
			roles: [role('nation-fra', 2)],
			weights: DEFAULT_WEIGHTS,
			reviewOf: (group) =>
				group.key === 'must'
					? { evaluation: 1, flagged: false, disqualified: false, required: true }
					: { evaluation: 5, flagged: true, disqualified: false },
			wishRankOf: (group) => (group.key === 'must' ? undefined : 1)
		});
		expect(result.map(({ group, target }) => [group.key, target.roleId])).toEqual([
			['must', 'nation-fra']
		]);
	});

	it('still gives a required group the role it wished for most', () => {
		const { groups } = assignmentGroups([delegation('must', 2), delegation('other', 2)], [], []);
		const result = autoAssign({
			size: 2,
			groups,
			roles: [role('nation-fra', 2), role('nation-gbr', 2)],
			weights: DEFAULT_WEIGHTS,
			reviewOf: (group) =>
				group.key === 'must'
					? { evaluation: null, flagged: false, disqualified: false, required: true }
					: undefined,
			wishRankOf: (group, target) =>
				group.key === 'must' ? (target.roleId === 'nation-gbr' ? 1 : 2) : undefined
		});
		expect(result.map(({ group, target }) => [group.key, target.roleId]).sort()).toEqual([
			['must', 'nation-gbr'],
			['other', 'nation-fra']
		]);
	});

	it('gives leftover roles to groups without a wish, in the same pass, after the wishes are served', () => {
		const { groups } = assignmentGroups([delegation('a', 2)], [], []);
		const base = {
			size: 2,
			groups,
			roles: [role('nation-fra', 2)],
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
			roles: [role('nation-fra', 2), role('nation-gbr', 2)],
			weights: DEFAULT_WEIGHTS,
			reviewOf: () => undefined,
			// both want FRA, only a also wants GBR: a must yield FRA so both are seated
			wishRankOf: (group, target) =>
				target.roleId === 'nation-fra'
					? group.key === 'a'
						? 1
						: 3
					: group.key === 'a'
						? 20
						: undefined
		});
		expect(result.map(({ group, target }) => [group.key, target.roleId]).sort()).toEqual([
			['a', 'nation-gbr'],
			['b', 'nation-fra']
		]);
	});

	it("weighs a well-rated group's wish higher in a contest", () => {
		const { groups } = assignmentGroups([delegation('a', 2), delegation('b', 2)], [], []);
		const result = autoAssign({
			size: 2,
			groups,
			roles: [role('nation-fra', 2), role('nation-gbr', 2)],
			weights: DEFAULT_WEIGHTS,
			reviewOf: (group) => ({
				evaluation: group.key === 'a' ? 5 : 1,
				flagged: false,
				disqualified: false
			}),
			// a: FRA 1st, GBR 2nd; b: FRA 1st, GBR 2nd - a symmetrical contest the rating decides
			wishRankOf: (_group, target) => (target.roleId === 'nation-fra' ? 1 : 2)
		});
		expect(result.find(({ group }) => group.key === 'a')?.target.roleId).toBe('nation-fra');
	});

	it('breaks ties the same way for the same seed regardless of input order', () => {
		const { groups } = assignmentGroups([delegation('a', 2), delegation('b', 2)], [], []);
		const run = (list: typeof groups) =>
			autoAssign({
				size: 2,
				groups: list,
				roles: [role('nation-fra', 2)],
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
			roles = [role('nation-fra', 2), role('nation-gbr', 2)],
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
				wishRankOf: (_group, target) => (target.roleId === 'nation-fra' ? 1 : 2)
			});
			return new Map(result.map(({ group, target }) => [group.key, target.roleId]));
		};

		it('lets newcomers win a contested role when experience counts against', () => {
			const result = run({ ...DEFAULT_WEIGHTS, experienceModifier: 4 });
			expect(result.get('new')).toBe('nation-fra');
			expect(result.get('vet')).toBe('nation-gbr');
		});

		it('lets experienced groups win it when experience counts in favour', () => {
			const result = run({ ...DEFAULT_WEIGHTS, experienceModifier: -4 });
			expect(result.get('vet')).toBe('nation-fra');
			expect(result.get('new')).toBe('nation-gbr');
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
					role('nation-fra', 2)
				]);
				expect([...result.keys()]).toEqual(['new']);
			}
		});

		it('leaves newcomers out first when experience is rewarded', () => {
			const result = run({ ...DEFAULT_WEIGHTS, experienceModifier: -4 }, [role('nation-fra', 2)]);
			expect([...result.keys()]).toEqual(['vet']);
		});
	});
});

describe('autoAssign matching quality', () => {
	type Wishes = Record<string, string[]>;
	const rankFrom =
		(wishes: Wishes) => (group: { key: string }, target: { roleId: string | null }) => {
			const index = wishes[group.key]?.indexOf(target.roleId ?? '') ?? -1;
			return index < 0 ? undefined : index + 1;
		};
	const run = (
		wishes: Wishes,
		roleIds: string[],
		extra: Partial<Parameters<typeof autoAssign>[0]> = {},
		size = 4
	) => {
		const { groups } = assignmentGroups(
			Object.keys(wishes).map((key) => delegation(key, size)),
			[],
			[]
		);
		const result = autoAssign({
			size,
			groups,
			roles: roleIds.map((id) => role(id, size)),
			weights: DEFAULT_WEIGHTS,
			reviewOf: () => undefined,
			wishRankOf: rankFrom(wishes),
			...extra
		});
		return new Map(result.map(({ group, target }) => [group.key, target.roleId]));
	};

	// A small seeded generator so the randomised cases are reproducible.
	const random = (seed: number) => {
		let state = seed;
		return () => (state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 2 ** 32;
	};

	/** The most groups that can sit on a role they wished for (augmenting paths). */
	function maxWishedMatching(wishes: Wishes, roleIds: string[]) {
		const owner = new Map<string, string>();
		const place = (group: string, seen: Set<string>): boolean => {
			for (const code of wishes[group].filter((c) => roleIds.includes(c))) {
				if (seen.has(code)) continue;
				seen.add(code);
				const current = owner.get(code);
				if (current === undefined || place(current, seen)) {
					owner.set(code, group);
					return true;
				}
			}
			return false;
		};
		return Object.keys(wishes).filter((group) => place(group, new Set())).length;
	}

	it('seats the rank-1 wishes of the groups in the pool and fills the leftover role last', () => {
		// The shape that was reported: six free four-seat roles, groups wishing mostly for roles
		// that are not among them. Nobody wishes for DEU.
		const wishes: Wishes = {
			gnb: ['nation-gnb', 'nation-gtm', 'nation-uga'],
			jor: ['nation-jor', 'nation-gha', 'nation-eth'],
			yem: ['nation-yem', 'nation-est', 'nation-eth'],
			uga: ['nation-uga', 'nation-est', 'nation-gtm', 'nation-jor', 'nation-eth'],
			gtm: ['nation-gtm', 'nation-uga', 'nation-jor', 'nation-eth', 'nation-gnb'],
			rated: ['nation-eth', 'nation-gha', 'nation-gnb', 'nation-gtm'],
			plain: ['nation-eth', 'nation-gha', 'nation-gnb', 'nation-gtm'],
			lost: ['nation-est', 'nation-jem', 'nation-gha', 'nation-gnb', 'nation-gtm']
		};
		const result = run(
			wishes,
			['nation-deu', 'nation-gtm', 'nation-gnb', 'nation-yem', 'nation-jor', 'nation-uga'],
			{
				reviewOf: (group) =>
					group.key === 'rated'
						? { evaluation: 3.5, flagged: false, disqualified: false }
						: undefined
			}
		);
		expect(result.get('gnb')).toBe('nation-gnb');
		expect(result.get('jor')).toBe('nation-jor');
		expect(result.get('yem')).toBe('nation-yem');
		expect(result.get('uga')).toBe('nation-uga');
		expect(result.get('gtm')).toBe('nation-gtm');
		// The only role left goes to the best rated of those without any wish left.
		expect(result.get('rated')).toBe('nation-deu');
		expect(result.size).toBe(6);
	});

	it('never gives a group an unwished role while a free role it wished for stays empty', () => {
		const wishes: Wishes = {
			a: ['nation-fra', 'nation-gbr'],
			b: ['nation-gbr'],
			c: ['nation-esp'],
			d: ['nation-esp', 'nation-fra']
		};
		const result = run(wishes, ['nation-fra', 'nation-gbr', 'nation-ita']);
		for (const [group, code] of result) {
			if (wishes[group].includes(code ?? '')) continue;
			// An unwished role: so none of the roles still empty may be one this group wished for.
			const empty = ['nation-fra', 'nation-gbr', 'nation-ita'].filter(
				(c) => ![...result.values()].includes(c)
			);
			expect(empty.filter((c) => wishes[group].includes(c))).toEqual([]);
		}
	});

	it('seats a maximum number of groups on their wishes, however the wishes overlap', () => {
		for (let seed = 1; seed <= 200; seed++) {
			const next = random(seed);
			const roleIds = Array.from({ length: 1 + Math.floor(next() * 6) }, (_, i) => `R${i}`);
			const wishes: Wishes = {};
			for (let i = 0; i < 2 + Math.floor(next() * 30); i++) {
				wishes[`g${i}`] = roleIds
					.concat(['X1', 'X2', 'X3'])
					.filter(() => next() < 0.25)
					.sort(() => next() - 0.5);
			}
			const result = run(wishes, roleIds, { seed: String(seed) });
			const wishedSeated = [...result].filter(([group, code]) =>
				wishes[group].includes(code ?? '')
			).length;
			expect(wishedSeated, `seed ${seed}`).toBe(maxWishedMatching(wishes, roleIds));
			// Every role is used (there are always at least as many groups as roles here), once.
			const used = [...result.values()];
			expect(new Set(used).size, `seed ${seed}`).toBe(used.length);
			expect(used.length, `seed ${seed}`).toBe(
				Math.min(roleIds.length, Object.keys(wishes).length)
			);
		}
	});

	it('picks the cheapest of the maximum matchings', () => {
		// Both groups can only be seated one way; swapping would cost more or seat fewer.
		const result = run(
			{ a: ['nation-fra', 'nation-gbr'], b: ['nation-fra', 'nation-gbr'], c: ['nation-gbr'] },
			['nation-fra', 'nation-gbr']
		);
		expect(result.get('c')).toBe('nation-gbr');
		expect(result.get('a') === 'nation-fra' || result.get('b') === 'nation-fra').toBe(true);
		expect(result.size).toBe(2);
	});

	it('prefers two second wishes over one first and one far-down wish', () => {
		// a: FRA 1, GBR 2; b: FRA 1, GBR 5. Squared ranks: a=FRA,b=GBR costs 1+25, a=GBR,b=FRA costs 4+1.
		const result = run(
			{ a: ['nation-fra', 'nation-gbr'], b: ['nation-fra', 'X1', 'X2', 'X3', 'nation-gbr'] },
			['nation-fra', 'nation-gbr']
		);
		expect(result.get('b')).toBe('nation-fra');
		expect(result.get('a')).toBe('nation-gbr');
	});

	it('hands the leftover roles to the best rated groups without a seatable wish', () => {
		const wishes: Wishes = { low: ['X1'], high: ['X1'], mid: ['X1'] };
		const evaluation = { low: 1, high: 5, mid: 3 } as Record<string, number>;
		const result = run(wishes, ['nation-fra', 'nation-gbr'], {
			reviewOf: (group) => ({
				evaluation: evaluation[group.key],
				flagged: false,
				disqualified: false
			})
		});
		expect([...result.keys()].sort()).toEqual(['high', 'mid']);
	});

	it('does not seat anyone when no role has exactly the group size free', () => {
		const { groups } = assignmentGroups(
			[delegation('a', 4), delegation('b', 4, 'nation-fra')],
			[],
			[]
		);
		const result = autoAssign({
			size: 4,
			groups,
			// FRA has 8 free after b, GBR is bigger than the group, ESP is smaller.
			roles: [role('nation-fra', 12), role('nation-gbr', 6), role('nation-esp', 2)],
			weights: DEFAULT_WEIGHTS,
			reviewOf: () => undefined,
			wishRankOf: () => 1
		});
		expect(result).toEqual([]);
	});

	it('uses a role that is exactly as free as the group is large after others took seats', () => {
		const { groups } = assignmentGroups(
			[delegation('a', 4), delegation('b', 4, 'nation-fra')],
			[],
			[]
		);
		const result = autoAssign({
			size: 4,
			groups,
			roles: [role('nation-fra', 8)],
			weights: DEFAULT_WEIGHTS,
			reviewOf: () => undefined,
			wishRankOf: () => 1
		});
		expect(result.map(({ group }) => group.key)).toEqual(['a']);
	});

	it('only considers groups of the requested size', () => {
		const { groups } = assignmentGroups([delegation('two', 2), delegation('four', 4)], [], []);
		const result = autoAssign({
			size: 4,
			groups,
			roles: [role('nation-fra', 4)],
			weights: DEFAULT_WEIGHTS,
			reviewOf: () => undefined,
			wishRankOf: () => 1
		});
		expect(result.map(({ group }) => group.key)).toEqual(['four']);
	});

	it('handles a pool far larger than the roles, and a pool smaller than the roles', () => {
		const wishes: Wishes = {};
		for (let i = 0; i < 133; i++) wishes[`g${i}`] = [`R${i % 9}`, `R${(i + 3) % 9}`];
		const roleIds = ['R0', 'R1', 'R2', 'R3', 'R4', 'R5'];
		const many = run(wishes, roleIds);
		expect(many.size).toBe(6);
		expect([...many.values()].sort()).toEqual(roleIds);
		for (const [group, code] of many) expect(wishes[group]).toContain(code);

		const few = run({ a: ['R0'], b: ['R1'] }, roleIds);
		expect([...few.entries()].sort()).toEqual([
			['a', 'R0'],
			['b', 'R1']
		]);
	});

	it('is deterministic for a seed and gives every group a chance across seeds', () => {
		const wishes: Wishes = { a: ['nation-fra'], b: ['nation-fra'], c: ['nation-fra'] };
		const winners = new Set<string>();
		for (let i = 0; i < 40; i++) {
			const first = run(wishes, ['nation-fra'], { seed: `s${i}` });
			expect([...first]).toEqual([...run(wishes, ['nation-fra'], { seed: `s${i}` })]);
			winners.add([...first.keys()][0]);
		}
		expect(winners.size).toBe(3);
	});
});

describe('autoAssignSingles', () => {
	const single = (
		id: string,
		wished: string[],
		evaluation: number | null = null,
		disqualified = false
	) => ({
		id,
		wishedRoleIds: new Set(wished),
		review: { evaluation, flagged: false, disqualified },
		experience: 0
	});
	const input = (
		candidates: ReturnType<typeof single>[],
		roles: { id: string; freeSeats: number }[]
	) => ({ candidates, roles, weights: DEFAULT_WEIGHTS });

	test('only gives roles the applicant wished for', () => {
		const matches = autoAssignSingles(
			input(
				[single('a', ['press']), single('b', ['press'])],
				[
					{ id: 'press', freeSeats: 1 },
					{ id: 'it', freeSeats: 5 }
				]
			)
		);
		expect(matches).toHaveLength(1);
		expect(matches[0].roleId).toBe('press');
	});

	test('fills several seats of one role', () => {
		const matches = autoAssignSingles(
			input([single('a', ['press']), single('b', ['press'])], [{ id: 'press', freeSeats: 2 }])
		);
		expect(matches.map((match) => match.singleParticipantId).sort()).toEqual(['a', 'b']);
	});

	test('seats a required applicant before better-rated ones, but only on a wished role', () => {
		const required = (id: string, wished: string[]) => {
			const candidate = single(id, wished, 1);
			return { ...candidate, review: { ...candidate.review, required: true } };
		};
		const matches = autoAssignSingles(
			input(
				[single('high', ['press'], 5), required('must', ['press']), required('elsewhere', ['it'])],
				[{ id: 'press', freeSeats: 1 }]
			)
		);
		expect(matches).toEqual([{ singleParticipantId: 'must', roleId: 'press' }]);
	});

	test('seats the better rated applicant when a role is oversubscribed', () => {
		const matches = autoAssignSingles(
			input(
				[single('low', ['press'], 1), single('high', ['press'], 5), single('mid', ['press'], 3)],
				[{ id: 'press', freeSeats: 1 }]
			)
		);
		expect(matches).toEqual([{ singleParticipantId: 'high', roleId: 'press' }]);
	});

	test('moves someone to another wish to seat more people', () => {
		const matches = autoAssignSingles(
			input(
				[single('a', ['press', 'it']), single('b', ['press'])],
				[
					{ id: 'press', freeSeats: 1 },
					{ id: 'it', freeSeats: 1 }
				]
			)
		);
		expect(matches).toHaveLength(2);
		expect(matches.find((match) => match.singleParticipantId === 'b')?.roleId).toBe('press');
	});

	test('skips disqualified applicants and those without wishes', () => {
		const matches = autoAssignSingles(
			input([single('a', ['press'], null, true), single('b', [])], [{ id: 'press', freeSeats: 2 }])
		);
		expect(matches).toEqual([]);
	});
});
