import { describe, expect, it, it as test } from 'vitest';
import { DEFAULT_WEIGHTS, assignmentCost, autoAssign, autoAssignSingles } from './autoAssign';
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

	it('gives leftover roles to groups without a wish, in the same pass, after the wishes are served', () => {
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

describe('autoAssign matching quality', () => {
	type Wishes = Record<string, string[]>;
	const rankFrom =
		(wishes: Wishes) => (group: { key: string }, target: { nationAlpha3Code: string | null }) => {
			const index = wishes[group.key]?.indexOf(target.nationAlpha3Code ?? '') ?? -1;
			return index < 0 ? undefined : index + 1;
		};
	const run = (
		wishes: Wishes,
		roleCodes: string[],
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
			roles: roleCodes.map((code) => role(code, size)),
			weights: DEFAULT_WEIGHTS,
			reviewOf: () => undefined,
			wishRankOf: rankFrom(wishes),
			...extra
		});
		return new Map(result.map(({ group, target }) => [group.key, target.nationAlpha3Code]));
	};

	// A small seeded generator so the randomised cases are reproducible.
	const random = (seed: number) => {
		let state = seed;
		return () => (state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 2 ** 32;
	};

	/** The most groups that can sit on a role they wished for (augmenting paths). */
	function maxWishedMatching(wishes: Wishes, roleCodes: string[]) {
		const owner = new Map<string, string>();
		const place = (group: string, seen: Set<string>): boolean => {
			for (const code of wishes[group].filter((c) => roleCodes.includes(c))) {
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
			gnb: ['GNB', 'GTM', 'UGA'],
			jor: ['JOR', 'GHA', 'ETH'],
			yem: ['YEM', 'EST', 'ETH'],
			uga: ['UGA', 'EST', 'GTM', 'JOR', 'ETH'],
			gtm: ['GTM', 'UGA', 'JOR', 'ETH', 'GNB'],
			rated: ['ETH', 'GHA', 'GNB', 'GTM'],
			plain: ['ETH', 'GHA', 'GNB', 'GTM'],
			lost: ['EST', 'JEM', 'GHA', 'GNB', 'GTM']
		};
		const result = run(wishes, ['DEU', 'GTM', 'GNB', 'YEM', 'JOR', 'UGA'], {
			reviewOf: (group) =>
				group.key === 'rated' ? { evaluation: 3.5, flagged: false, disqualified: false } : undefined
		});
		expect(result.get('gnb')).toBe('GNB');
		expect(result.get('jor')).toBe('JOR');
		expect(result.get('yem')).toBe('YEM');
		expect(result.get('uga')).toBe('UGA');
		expect(result.get('gtm')).toBe('GTM');
		// The only role left goes to the best rated of those without any wish left.
		expect(result.get('rated')).toBe('DEU');
		expect(result.size).toBe(6);
	});

	it('never gives a group an unwished role while a free role it wished for stays empty', () => {
		const wishes: Wishes = {
			a: ['FRA', 'GBR'],
			b: ['GBR'],
			c: ['ESP'],
			d: ['ESP', 'FRA']
		};
		const result = run(wishes, ['FRA', 'GBR', 'ITA']);
		for (const [group, code] of result) {
			if (wishes[group].includes(code ?? '')) continue;
			// An unwished role: so none of the roles still empty may be one this group wished for.
			const empty = ['FRA', 'GBR', 'ITA'].filter((c) => ![...result.values()].includes(c));
			expect(empty.filter((c) => wishes[group].includes(c))).toEqual([]);
		}
	});

	it('seats a maximum number of groups on their wishes, however the wishes overlap', () => {
		for (let seed = 1; seed <= 200; seed++) {
			const next = random(seed);
			const roleCodes = Array.from({ length: 1 + Math.floor(next() * 6) }, (_, i) => `R${i}`);
			const wishes: Wishes = {};
			for (let i = 0; i < 2 + Math.floor(next() * 30); i++) {
				wishes[`g${i}`] = roleCodes
					.concat(['X1', 'X2', 'X3'])
					.filter(() => next() < 0.25)
					.sort(() => next() - 0.5);
			}
			const result = run(wishes, roleCodes, { seed: String(seed) });
			const wishedSeated = [...result].filter(([group, code]) =>
				wishes[group].includes(code ?? '')
			).length;
			expect(wishedSeated, `seed ${seed}`).toBe(maxWishedMatching(wishes, roleCodes));
			// Every role is used (there are always at least as many groups as roles here), once.
			const used = [...result.values()];
			expect(new Set(used).size, `seed ${seed}`).toBe(used.length);
			expect(used.length, `seed ${seed}`).toBe(
				Math.min(roleCodes.length, Object.keys(wishes).length)
			);
		}
	});

	it('picks the cheapest of the maximum matchings', () => {
		// Both groups can only be seated one way; swapping would cost more or seat fewer.
		const result = run({ a: ['FRA', 'GBR'], b: ['FRA', 'GBR'], c: ['GBR'] }, ['FRA', 'GBR']);
		expect(result.get('c')).toBe('GBR');
		expect(result.get('a') === 'FRA' || result.get('b') === 'FRA').toBe(true);
		expect(result.size).toBe(2);
	});

	it('prefers two second wishes over one first and one far-down wish', () => {
		// a: FRA 1, GBR 2; b: FRA 1, GBR 5. Squared ranks: a=FRA,b=GBR costs 1+25, a=GBR,b=FRA costs 4+1.
		const result = run({ a: ['FRA', 'GBR'], b: ['FRA', 'X1', 'X2', 'X3', 'GBR'] }, ['FRA', 'GBR']);
		expect(result.get('b')).toBe('FRA');
		expect(result.get('a')).toBe('GBR');
	});

	it('hands the leftover roles to the best rated groups without a seatable wish', () => {
		const wishes: Wishes = { low: ['X1'], high: ['X1'], mid: ['X1'] };
		const evaluation = { low: 1, high: 5, mid: 3 } as Record<string, number>;
		const result = run(wishes, ['FRA', 'GBR'], {
			reviewOf: (group) => ({
				evaluation: evaluation[group.key],
				flagged: false,
				disqualified: false
			})
		});
		expect([...result.keys()].sort()).toEqual(['high', 'mid']);
	});

	it('does not seat anyone when no role has exactly the group size free', () => {
		const { groups } = assignmentGroups([delegation('a', 4), delegation('b', 4, 'FRA')], [], []);
		const result = autoAssign({
			size: 4,
			groups,
			// FRA has 8 free after b, GBR is bigger than the group, ESP is smaller.
			roles: [role('FRA', 12), role('GBR', 6), role('ESP', 2)],
			weights: DEFAULT_WEIGHTS,
			reviewOf: () => undefined,
			wishRankOf: () => 1
		});
		expect(result).toEqual([]);
	});

	it('uses a role that is exactly as free as the group is large after others took seats', () => {
		const { groups } = assignmentGroups([delegation('a', 4), delegation('b', 4, 'FRA')], [], []);
		const result = autoAssign({
			size: 4,
			groups,
			roles: [role('FRA', 8)],
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
			roles: [role('FRA', 4)],
			weights: DEFAULT_WEIGHTS,
			reviewOf: () => undefined,
			wishRankOf: () => 1
		});
		expect(result.map(({ group }) => group.key)).toEqual(['four']);
	});

	it('handles a pool far larger than the roles, and a pool smaller than the roles', () => {
		const wishes: Wishes = {};
		for (let i = 0; i < 133; i++) wishes[`g${i}`] = [`R${i % 9}`, `R${(i + 3) % 9}`];
		const roleCodes = ['R0', 'R1', 'R2', 'R3', 'R4', 'R5'];
		const many = run(wishes, roleCodes);
		expect(many.size).toBe(6);
		expect([...many.values()].sort()).toEqual(roleCodes);
		for (const [group, code] of many) expect(wishes[group]).toContain(code);

		const few = run({ a: ['R0'], b: ['R1'] }, roleCodes);
		expect([...few.entries()].sort()).toEqual([
			['a', 'R0'],
			['b', 'R1']
		]);
	});

	it('is deterministic for a seed and gives every group a chance across seeds', () => {
		const wishes: Wishes = { a: ['FRA'], b: ['FRA'], c: ['FRA'] };
		const winners = new Set<string>();
		for (let i = 0; i < 40; i++) {
			const first = run(wishes, ['FRA'], { seed: `s${i}` });
			expect([...first]).toEqual([...run(wishes, ['FRA'], { seed: `s${i}` })]);
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
