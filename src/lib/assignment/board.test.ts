import { describe, expect, it } from 'vitest';
import {
	CONVERT_CONTAINER,
	POOL_CONTAINER,
	assignmentMutation,
	boardState,
	canSplit,
	cardBorder,
	describeRole,
	hasRole,
	inPageOrder,
	mergedRoles,
	dropAction,
	pendingCount,
	pickSize,
	releaseNotice,
	poolGroups,
	roleArgs,
	roleContainer,
	rolesWithSeats,
	singleDropAction,
	sizeOptions,
	wishList,
	wishRank,
	wishStatus,
	type BoardRoles,
	type BoardRows
} from './board';
import type { AssignmentGroup } from './state';

const delegation = (id: string, size: number, nation: string | null = null) => ({
	id,
	assignedNationAlpha3Code: nation,
	assignedNonStateActorId: null,
	members: Array.from({ length: size }, (_, i) => ({ id: `${id}-${i}`, isHeadDelegate: i === 0 }))
});

const roles: BoardRoles = {
	committees: [
		{
			abbreviation: 'GA',
			numOfSeatsPerDelegation: 2,
			nations: [
				{ alpha2Code: 'fr', alpha3Code: 'FRA' },
				{ alpha2Code: 'de', alpha3Code: 'DEU' }
			]
		},
		{
			abbreviation: 'SC',
			numOfSeatsPerDelegation: 1,
			nations: [{ alpha2Code: 'fr', alpha3Code: 'FRA' }]
		}
	],
	nonStateActors: [
		{ id: 'amn', name: 'Amnesty', abbreviation: 'AI', fontAwesomeIcon: 'dove', seatAmount: 2 }
	]
};

const rows = (overrides: Partial<BoardRows> = {}): BoardRows => ({
	delegations: [delegation('a', 2), delegation('b', 3, 'FRA'), delegation('c', 2)],
	singleParticipants: [{ id: 's', assignedRoleId: null }],
	units: [],
	draftSingleRoles: [],
	reviews: [
		{ delegationId: 'a', evaluation: 4, flagged: false, disqualified: false },
		{ delegationId: 'c', evaluation: 5, flagged: false, disqualified: true }
	],
	...overrides
});

describe('boardState', () => {
	const view = boardState(rows(), roles);

	it('seats every nation across its committees and the non-state actors', () => {
		expect(view.seated.map((role) => [role.key, role.seats])).toEqual([
			['nation:FRA', 3],
			['nation:DEU', 2],
			['nsa:amn', 2]
		]);
		expect(view.taken.get('nation:FRA')).toBe(3);
	});

	it('finds the review of a group by its application', () => {
		expect(view.reviewOf({ delegationId: 'a', singleParticipantId: null })?.evaluation).toBe(4);
		expect(view.reviewOf({ delegationId: null, singleParticipantId: 's' })).toBeUndefined();
	});

	it('counts open groups and roles not yet full per size', () => {
		// The single participant is no group: only converted ones are.
		expect(sizeOptions(view)).toEqual([
			{ size: 2, openGroups: 1, unfilledRoles: 2 },
			{ size: 3, openGroups: 0, unfilledRoles: 0 }
		]);
		const halfFull = boardState(rows({ delegations: [delegation('d', 1, 'DEU')] }), roles);
		expect(sizeOptions(halfFull).find((option) => option.size === 2)?.unfilledRoles).toBe(2);
	});

	it('picks the asked size, else the first with open groups', () => {
		const options = sizeOptions(view);
		expect(pickSize(options, 3)).toBe(3);
		expect(pickSize(options, 0)).toBe(2);
		expect(pickSize([{ size: 4, openGroups: 0 }], 0)).toBe(4);
		expect(pickSize([], 0)).toBe(0);
	});

	it('adds the open groups the backend counted, and sizes only they come in', () => {
		const options = sizeOptions(
			view,
			new Map([
				[2, 5],
				[7, 3],
				[9, 0]
			])
		);
		expect(options).toEqual([
			{ size: 2, openGroups: 6, unfilledRoles: 2 },
			{ size: 3, openGroups: 0, unfilledRoles: 0 },
			{ size: 7, openGroups: 3, unfilledRoles: 0 }
		]);
	});

	it('pools unassigned groups in the order given, disqualified ones only on request', () => {
		expect(poolGroups(view, 2, false).map((g) => g.key)).toEqual(['a']);
		expect(poolGroups(view, 2, true).map((g) => g.key)).toEqual(['a', 'c']);
	});

	it('tells groups with a role from those without', () => {
		expect(hasRole(view.groups.find((g) => g.key === 'b'))).toBe(true);
		expect(hasRole(view.groups.find((g) => g.key === 'a'))).toBe(false);
		expect(hasRole(undefined)).toBe(false);
	});

	it('lists the roles of a seat count with what is planned onto them', () => {
		expect(rolesWithSeats(view, 3)).toMatchObject([
			{ key: 'nation:FRA', taken: 3, groups: [{ key: 'b' }] }
		]);
	});

	it('turns single participants planned as delegations into groups, not singles', () => {
		const converted = boardState(
			rows({
				units: [
					{
						id: 'u',
						sourceSingleParticipantId: 's',
						nationAlpha3Code: 'DEU',
						members: []
					}
				]
			}),
			roles
		);
		expect(converted.singles).toEqual([]);
		expect(converted.taken.get('nation:DEU')).toBe(1);
	});
});

describe('inPageOrder', () => {
	const view = boardState(
		rows({
			delegations: [delegation('p1', 2), delegation('p0', 2), delegation('moved', 2)],
			reviews: [{ delegationId: 'p1', evaluation: 5, flagged: false, disqualified: false }]
		}),
		roles
	);

	it('keeps the groups of earlier pages first, whatever order they come in', () => {
		const pool = poolGroups(view, 2, false);
		expect(pool[0].key).toBe('p1');
		const ordered = inPageOrder(pool, [[{ id: 'p0' }], [{ id: 'p1' }]]);
		expect(ordered.map((group) => group.key)).toEqual(['moved', 'p0', 'p1']);
	});

	it('keeps the order within a page', () => {
		const pool = poolGroups(view, 2, false);
		const onePage = inPageOrder(pool, [[{ id: 'p0' }, { id: 'p1' }, { id: 'moved' }]]);
		expect(onePage.map((group) => group.key)).toEqual(pool.map((group) => group.key));
	});
});

describe('dropAction', () => {
	const view = boardState(rows(), roles);

	it('unassigns a group dropped into the pool', () => {
		expect(dropAction(view, 'b', roleContainer('nation:FRA'), POOL_CONTAINER)).toMatchObject({
			type: 'assign',
			target: null
		});
	});

	it('assigns a group to a role with room for it and refuses one without', () => {
		expect(dropAction(view, 'a', POOL_CONTAINER, roleContainer('nation:DEU'))).toMatchObject({
			type: 'assign',
			target: { nationAlpha3Code: 'DEU' }
		});
		expect(dropAction(view, 'a', POOL_CONTAINER, roleContainer('nation:FRA'))).toEqual({
			type: 'full'
		});
	});

	it('ignores drops that go nowhere', () => {
		expect(dropAction(view, 'a', POOL_CONTAINER, POOL_CONTAINER)).toBeUndefined();
		expect(dropAction(view, 'a', POOL_CONTAINER, null)).toBeUndefined();
		expect(dropAction(view, 'x', POOL_CONTAINER, roleContainer('nation:DEU'))).toBeUndefined();
		expect(dropAction(view, 'a', POOL_CONTAINER, roleContainer('nation:XXX'))).toBeUndefined();
	});
});

describe('assignmentMutation', () => {
	const group = (overrides: Partial<AssignmentGroup>): AssignmentGroup => ({
		key: 'k',
		unitId: null,
		delegationId: null,
		singleParticipantId: null,
		memberIds: [],
		size: 1,
		whole: true,
		part: false,
		target: { nationAlpha3Code: null, nonStateActorId: null },
		liveTarget: { nationAlpha3Code: null, nonStateActorId: null },
		pending: false,
		...overrides
	});

	it('plans parts and converted single participants through their unit', () => {
		expect(assignmentMutation(group({ unitId: 'u', delegationId: 'd', part: true }))).toEqual({
			kind: 'unit',
			unitId: 'u'
		});
		expect(assignmentMutation(group({ unitId: 'u', singleParticipantId: 's' }))).toEqual({
			kind: 'unit',
			unitId: 'u'
		});
	});

	it('plans a whole delegation as such, even with a unit of its own', () => {
		expect(assignmentMutation(group({ unitId: 'u', delegationId: 'd' }))).toEqual({
			kind: 'delegation',
			delegationId: 'd'
		});
		expect(assignmentMutation(group({}))).toBeUndefined();
	});

	it('splits whole delegations of more than one only', () => {
		expect(canSplit(group({ delegationId: 'd', size: 3 }))).toBe(true);
		expect(canSplit(group({ delegationId: 'd', size: 1 }))).toBe(false);
		expect(canSplit(group({ delegationId: 'd', size: 3, part: true, whole: false }))).toBe(false);
		expect(canSplit(group({ singleParticipantId: 's' }))).toBe(false);
	});

	it('passes no nulls as arguments', () => {
		expect(roleArgs(null)).toEqual({ nationAlpha3Code: undefined, nonStateActorId: undefined });
		expect(roleArgs({ nationAlpha3Code: 'FRA', nonStateActorId: null })).toEqual({
			nationAlpha3Code: 'FRA',
			nonStateActorId: undefined
		});
	});
});

describe('describeRole and wishRank', () => {
	const name = (code: string) => `name of ${code}`;

	it('names a nation with its committees and flag', () => {
		expect(describeRole({ nationAlpha3Code: 'FRA', nonStateActorId: null }, roles, name)).toEqual({
			title: 'name of FRA',
			subtitle: 'GA, SC',
			alpha2Code: 'fr',
			icon: undefined
		});
	});

	it('names a non-state actor with its icon', () => {
		expect(describeRole({ nationAlpha3Code: null, nonStateActorId: 'amn' }, roles, name)).toEqual({
			title: 'AI',
			subtitle: 'Amnesty',
			alpha2Code: undefined,
			icon: 'dove'
		});
		expect(describeRole({ nationAlpha3Code: null, nonStateActorId: 'x' }, roles, name).title).toBe(
			''
		);
	});

	it('finds the rank of a wished role', () => {
		const wishes = [
			{ rank: 1, nation: { alpha3Code: 'FRA' }, nonStateActor: null },
			{ rank: 2, nation: null, nonStateActor: { id: 'amn' } }
		];
		expect(wishRank(wishes, { nationAlpha3Code: 'FRA', nonStateActorId: null })).toBe(1);
		expect(wishRank(wishes, { nationAlpha3Code: null, nonStateActorId: 'amn' })).toBe(2);
		expect(wishRank(wishes, { nationAlpha3Code: 'DEU', nonStateActorId: null })).toBeUndefined();
		expect(wishRank(wishes, { nationAlpha3Code: null, nonStateActorId: null })).toBeUndefined();
		expect(wishRank(undefined, { nationAlpha3Code: 'FRA', nonStateActorId: null })).toBeUndefined();
	});

	describe('wishList', () => {
		const wishes = [
			{ rank: 2, nation: { alpha3Code: 'FRA' }, nonStateActor: null },
			{ rank: 1, nation: null, nonStateActor: { id: 'amn', abbreviation: 'AI' } },
			{ rank: 3, nation: null, nonStateActor: null }
		];

		it('lists the wishes by rank while no role is held', () => {
			expect(wishList(wishes, { nationAlpha3Code: null, nonStateActorId: null }, name)).toEqual([
				{ key: 'amn', rank: 1, name: 'AI', matches: false },
				{ key: 'FRA', rank: 2, name: 'name of FRA', matches: false },
				{ key: '3', rank: 3, name: '', matches: false }
			]);
		});

		it('puts the wish matching the role first', () => {
			const nation = wishList(wishes, { nationAlpha3Code: 'FRA', nonStateActorId: null }, name);
			expect(nation.map((wish) => [wish.key, wish.matches])).toEqual([
				['FRA', true],
				['amn', false],
				['3', false]
			]);
			const nsa = wishList(wishes, { nationAlpha3Code: null, nonStateActorId: 'amn' }, name);
			expect(nsa.filter((wish) => wish.matches).map((wish) => wish.key)).toEqual(['amn']);
		});

		it('has nothing to list without wishes', () => {
			expect(wishList(undefined, { nationAlpha3Code: 'FRA', nonStateActorId: null }, name)).toEqual(
				[]
			);
		});
	});
});

describe('pendingCount', () => {
	it('counts the groups and single participants applying would change', () => {
		expect(pendingCount(rows())).toBe(0);
		expect(
			pendingCount(
				rows({
					units: [{ id: 'u', sourceDelegationId: 'a', nationAlpha3Code: 'DEU', members: [] }],
					draftSingleRoles: [{ singleParticipantId: 's', roleId: 'press' }]
				})
			)
		).toBe(2);
	});
});

describe('singleDropAction', () => {
	it('converts, assigns a custom role or takes it away', () => {
		expect(singleDropAction(POOL_CONTAINER, CONVERT_CONTAINER)).toEqual({ type: 'convert' });
		expect(singleDropAction(POOL_CONTAINER, roleContainer('press'))).toEqual({
			type: 'role',
			roleId: 'press'
		});
		expect(singleDropAction(roleContainer('press'), POOL_CONTAINER)).toEqual({
			type: 'role',
			roleId: undefined
		});
	});

	it('ignores drops that go nowhere', () => {
		expect(singleDropAction(POOL_CONTAINER, POOL_CONTAINER)).toBeUndefined();
		expect(singleDropAction(POOL_CONTAINER, null)).toBeUndefined();
	});
});

describe('finish tab', () => {
	it('names the roles applying would merge', () => {
		const merging = boardState(
			rows({ units: [{ id: 'u', sourceDelegationId: 'a', nationAlpha3Code: 'FRA', members: [] }] }),
			roles
		);
		expect([...mergedRoles(merging.groups)]).toEqual(['nation:FRA']);
		expect(mergedRoles(boardState(rows(), roles).groups).size).toBe(0);
	});

	it('reminds to release once applied, until released', () => {
		expect(releaseNotice(true, true)).toBe('released');
		expect(releaseNotice(false, true)).toBe('reminder');
		expect(releaseNotice(false, false)).toBe('hidden');
	});
});

describe('card details', () => {
	it('relates a planned role to the wishes', () => {
		const wishes = [{ rank: 1, nation: { alpha3Code: 'FRA' } }];
		const fra = { nationAlpha3Code: 'FRA', nonStateActorId: null };
		expect(wishStatus(wishes, fra)).toEqual({ rank: 1 });
		expect(wishStatus([], fra)).toEqual({ rank: undefined });
		expect(wishStatus(undefined, fra)).toBeUndefined();
		expect(wishStatus(wishes, { nationAlpha3Code: null, nonStateActorId: null })).toBeUndefined();
	});

	it('borders a card by what matters most', () => {
		const review = { flagged: true, disqualified: true };
		expect(cardBorder(review, true)).toBe('border-error');
		expect(cardBorder({ ...review, disqualified: false }, true)).toBe('border-warning');
		expect(cardBorder(undefined, true)).toBe('border-primary border-dashed');
		expect(cardBorder(undefined, false)).toBe('border-base-300');
	});
});
