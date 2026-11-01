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
	poolCountsBesidesDraft,
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
} from './boardState';
import { seatedRoles } from '#lib/assignment/capacity';
import type { AssignmentGroup } from '#lib/assignment/state';

const delegation = (id: string, size: number, roleId: string | null = null) => ({
	id,
	assignedRoleId: roleId,
	members: Array.from({ length: size }, (_, i) => ({ id: `${id}-${i}`, isHeadDelegate: i === 0 }))
});

const roles: BoardRoles = {
	committees: [
		{
			abbreviation: 'GA',
			numOfSeatsPerDelegation: 2,
			roles: [
				{ id: 'nation-fra', nation: { alpha2Code: 'fr', alpha3Code: 'FRA' } },
				{ id: 'nation-deu', nation: { alpha2Code: 'de', alpha3Code: 'DEU' } }
			]
		},
		{
			abbreviation: 'SC',
			numOfSeatsPerDelegation: 1,
			roles: [{ id: 'nation-fra', nation: { alpha2Code: 'fr', alpha3Code: 'FRA' } }]
		}
	],
	nonStateActors: [
		{
			id: 'nsa-amnesty',
			name: 'Amnesty',
			abbreviation: 'AI',
			fontAwesomeIcon: 'dove',
			seatAmount: 2
		}
	]
};

const seated = seatedRoles({ committees: roles.committees, nonStateActors: roles.nonStateActors });

const rows = (overrides: Partial<BoardRows> = {}): BoardRows => ({
	delegations: [delegation('a', 2), delegation('b', 3, 'nation-fra'), delegation('c', 2)],
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
	const view = boardState(rows(), seated);

	it('seats every nation across its committees and the non-state actors', () => {
		expect(view.seated.map((role) => [role.key, role.seats])).toEqual([
			['nation-fra', 3],
			['nation-deu', 2],
			['nsa-amnesty', 2]
		]);
		expect(view.taken.get('nation-fra')).toBe(3);
	});

	it('finds the review of a group by its application', () => {
		expect(view.reviewOf({ delegationId: 'a', singleParticipantId: null })?.evaluation).toBe(4);
		expect(view.reviewOf({ delegationId: null, singleParticipantId: 's' })).toBeUndefined();
	});

	it('counts open groups and roles not yet full per size', () => {
		// The single participant is no group: only converted ones are.
		expect(sizeOptions({ view })).toEqual([
			{ size: 2, openGroups: 1, unfilledRoles: 2 },
			{ size: 3, openGroups: 0, unfilledRoles: 0 }
		]);
		const halfFull = boardState(rows({ delegations: [delegation('d', 1, 'nation-deu')] }), seated);
		expect(sizeOptions({ view: halfFull }).find((option) => option.size === 2)?.unfilledRoles).toBe(
			2
		);
	});

	it('picks the asked size, else the first with open groups', () => {
		const options = sizeOptions({ view });
		expect(pickSize({ options, asked: 3 })).toBe(3);
		expect(pickSize({ options, asked: 0 })).toBe(2);
		expect(pickSize({ options: [{ size: 4, openGroups: 0 }], asked: 0 })).toBe(4);
		expect(pickSize({ options: [], asked: 0 })).toBe(0);
	});

	it('adds the open groups the backend counted, and sizes only they come in', () => {
		const options = sizeOptions({
			view,
			poolCounts: new Map([
				[2, 5],
				[7, 3],
				[9, 0]
			])
		});
		expect(options).toEqual([
			{ size: 2, openGroups: 6, unfilledRoles: 2 },
			{ size: 3, openGroups: 0, unfilledRoles: 0 },
			{ size: 7, openGroups: 3, unfilledRoles: 0 }
		]);
	});

	it('pools unassigned groups in the order given, disqualified ones only on request', () => {
		expect(poolGroups({ view, size: 2, showDisqualified: false }).map((g) => g.key)).toEqual(['a']);
		expect(poolGroups({ view, size: 2, showDisqualified: true }).map((g) => g.key)).toEqual([
			'a',
			'c'
		]);
	});

	it('tells groups with a role from those without', () => {
		expect(hasRole(view.groups.find((g) => g.key === 'b'))).toBe(true);
		expect(hasRole(view.groups.find((g) => g.key === 'a'))).toBe(false);
		expect(hasRole(undefined)).toBe(false);
	});

	it('lists the roles of a seat count with what is planned onto them', () => {
		expect(rolesWithSeats({ view, seats: 3 })).toMatchObject([
			{ key: 'nation-fra', taken: 3, groups: [{ key: 'b' }] }
		]);
	});

	it('turns single participants planned as delegations into groups, not singles', () => {
		const converted = boardState(
			rows({
				units: [
					{
						id: 'u',
						sourceSingleParticipantId: 's',
						roleId: 'nation-deu',
						members: []
					}
				]
			}),
			seated
		);
		expect(converted.singles).toEqual([]);
		expect(converted.taken.get('nation-deu')).toBe(1);
	});
});

describe('poolCountsBesidesDraft', () => {
	const counts = new Map([
		[2, 3],
		[4, 1]
	]);
	const touched = (id: string, size: number, roleId: string | null = null) => ({
		...delegation(id, size, roleId),
		members: Array.from({ length: size }, (_, i) => ({ id: `${id}-${i}` }))
	});

	it('takes the delegations the draft touches out of the counts of their size', () => {
		const result = poolCountsBesidesDraft({
			counts,
			touched: [touched('a', 2), touched('b', 4)],
			disqualified: () => false
		});
		expect([...result]).toEqual([
			[2, 2],
			[4, 0]
		]);
	});

	it('leaves alone those the backend did not count', () => {
		// a live role, an exclusion while excluded ones are hidden, a size without a count
		const result = poolCountsBesidesDraft({
			counts,
			touched: [touched('held', 2, 'nation-fra'), touched('out', 2), touched('big', 7)],
			disqualified: (id) => id === 'out'
		});
		expect([...result]).toEqual([...counts]);
	});
});

describe('inPageOrder', () => {
	const view = boardState(
		rows({
			delegations: [delegation('p1', 2), delegation('p0', 2), delegation('moved', 2)],
			reviews: [{ delegationId: 'p1', evaluation: 5, flagged: false, disqualified: false }]
		}),
		seated
	);

	it('keeps the groups of earlier pages first, whatever order they come in', () => {
		const pool = poolGroups({ view, size: 2, showDisqualified: false });
		expect(pool[0].key).toBe('p1');
		const ordered = inPageOrder({ groups: pool, pages: [[{ id: 'p0' }], [{ id: 'p1' }]] });
		expect(ordered.map((group) => group.key)).toEqual(['moved', 'p0', 'p1']);
	});

	it('keeps the order within a page', () => {
		const pool = poolGroups({ view, size: 2, showDisqualified: false });
		const onePage = inPageOrder({
			groups: pool,
			pages: [[{ id: 'p0' }, { id: 'p1' }, { id: 'moved' }]]
		});
		expect(onePage.map((group) => group.key)).toEqual(pool.map((group) => group.key));
	});
});

describe('dropAction', () => {
	const view = boardState(rows(), seated);

	it('unassigns a group dropped into the pool', () => {
		expect(
			dropAction({
				view,
				groupKey: 'b',
				source: roleContainer('nation-fra'),
				container: POOL_CONTAINER
			})
		).toMatchObject({
			type: 'assign',
			target: null
		});
	});

	it('assigns a group to a role with room for it and refuses one without', () => {
		expect(
			dropAction({
				view,
				groupKey: 'a',
				source: POOL_CONTAINER,
				container: roleContainer('nation-deu')
			})
		).toMatchObject({
			type: 'assign',
			target: { roleId: 'nation-deu' }
		});
		expect(
			dropAction({
				view,
				groupKey: 'a',
				source: POOL_CONTAINER,
				container: roleContainer('nation-fra')
			})
		).toEqual({
			type: 'full'
		});
	});

	it('ignores drops that go nowhere', () => {
		expect(
			dropAction({ view, groupKey: 'a', source: POOL_CONTAINER, container: POOL_CONTAINER })
		).toBeUndefined();
		expect(
			dropAction({ view, groupKey: 'a', source: POOL_CONTAINER, container: null })
		).toBeUndefined();
		expect(
			dropAction({
				view,
				groupKey: 'x',
				source: POOL_CONTAINER,
				container: roleContainer('nation-deu')
			})
		).toBeUndefined();
		expect(
			dropAction({
				view,
				groupKey: 'a',
				source: POOL_CONTAINER,
				container: roleContainer('nation-xxx')
			})
		).toBeUndefined();
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
		target: { roleId: null },
		liveTarget: { roleId: null },
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
		expect(roleArgs(null)).toEqual({ roleId: undefined });
		expect(roleArgs({ roleId: null })).toEqual({ roleId: undefined });
		expect(roleArgs({ roleId: 'nation-fra' })).toEqual({ roleId: 'nation-fra' });
	});
});

describe('describeRole and wishRank', () => {
	const name = (code: string) => `name of ${code}`;

	it('names a nation with its committees and flag', () => {
		expect(describeRole({ target: { roleId: 'nation-fra' }, roles, nationName: name })).toEqual({
			title: 'name of FRA',
			subtitle: 'GA, SC',
			alpha2Code: 'fr',
			icon: undefined
		});
	});

	it('names a non-state actor with its icon', () => {
		expect(describeRole({ target: { roleId: 'nsa-amnesty' }, roles, nationName: name })).toEqual({
			title: 'AI',
			subtitle: 'Amnesty',
			alpha2Code: undefined,
			icon: 'dove'
		});
		expect(describeRole({ target: { roleId: 'x' }, roles, nationName: name }).title).toBe('');
	});

	it('finds the rank of a wished role', () => {
		const wishes = [
			{ rank: 1, roleId: 'nation-fra' },
			{ rank: 2, roleId: 'nsa-amnesty' }
		];
		expect(wishRank({ wishes, target: { roleId: 'nation-fra' } })).toBe(1);
		expect(wishRank({ wishes, target: { roleId: 'nsa-amnesty' } })).toBe(2);
		expect(wishRank({ wishes, target: { roleId: 'nation-deu' } })).toBeUndefined();
		expect(wishRank({ wishes, target: { roleId: null } })).toBeUndefined();
		expect(wishRank({ wishes: undefined, target: { roleId: 'nation-fra' } })).toBeUndefined();
	});

	describe('wishList', () => {
		const wishes = [
			{ rank: 2, roleId: 'nation-fra', role: { nation: { alpha3Code: 'FRA' } } },
			{ rank: 1, roleId: 'nsa-amnesty', role: { abbreviation: 'AI' } },
			{ rank: 3, roleId: 'nameless', role: {} }
		];

		it('lists the wishes by rank while no role is held', () => {
			expect(wishList({ wishes, target: { roleId: null }, nationName: name })).toEqual([
				{ key: 'nsa-amnesty', rank: 1, name: 'AI', matches: false },
				{ key: 'nation-fra', rank: 2, name: 'name of FRA', matches: false },
				{ key: 'nameless', rank: 3, name: '', matches: false }
			]);
		});

		it('puts the wish matching the role first', () => {
			const nation = wishList({ wishes, target: { roleId: 'nation-fra' }, nationName: name });
			expect(nation.map((wish) => [wish.key, wish.matches])).toEqual([
				['nation-fra', true],
				['nsa-amnesty', false],
				['nameless', false]
			]);
			const nsa = wishList({ wishes, target: { roleId: 'nsa-amnesty' }, nationName: name });
			expect(nsa.filter((wish) => wish.matches).map((wish) => wish.key)).toEqual(['nsa-amnesty']);
		});

		it('has nothing to list without wishes', () => {
			expect(
				wishList({ wishes: undefined, target: { roleId: 'nation-fra' }, nationName: name })
			).toEqual([]);
		});
	});
});

describe('pendingCount', () => {
	it('counts the groups and single participants applying would change', () => {
		expect(pendingCount(rows())).toBe(0);
		expect(
			pendingCount(
				rows({
					units: [{ id: 'u', sourceDelegationId: 'a', roleId: 'nation-deu', members: [] }],
					draftSingleRoles: [{ singleParticipantId: 's', roleId: 'press' }]
				})
			)
		).toBe(2);
	});
});

describe('singleDropAction', () => {
	it('converts, assigns a custom role or takes it away', () => {
		expect(singleDropAction({ source: POOL_CONTAINER, container: CONVERT_CONTAINER })).toEqual({
			type: 'convert'
		});
		expect(singleDropAction({ source: POOL_CONTAINER, container: roleContainer('press') })).toEqual(
			{
				type: 'role',
				roleId: 'press'
			}
		);
		expect(singleDropAction({ source: roleContainer('press'), container: POOL_CONTAINER })).toEqual(
			{
				type: 'role',
				roleId: undefined
			}
		);
	});

	it('ignores drops that go nowhere', () => {
		expect(singleDropAction({ source: POOL_CONTAINER, container: POOL_CONTAINER })).toBeUndefined();
		expect(singleDropAction({ source: POOL_CONTAINER, container: null })).toBeUndefined();
	});
});

describe('finish tab', () => {
	it('names the roles applying would merge', () => {
		const merging = boardState(
			rows({
				units: [{ id: 'u', sourceDelegationId: 'a', roleId: 'nation-fra', members: [] }]
			}),
			seated
		);
		expect([...mergedRoles(merging.groups)]).toEqual(['nation-fra']);
		expect(mergedRoles(boardState(rows(), seated).groups).size).toBe(0);
	});

	it('reminds to release once applied, until released', () => {
		expect(releaseNotice({ released: true, justApplied: true })).toBe('released');
		expect(releaseNotice({ released: false, justApplied: true })).toBe('reminder');
		expect(releaseNotice({ released: false, justApplied: false })).toBe('hidden');
	});
});

describe('card details', () => {
	it('relates a planned role to the wishes', () => {
		const wishes = [{ rank: 1, roleId: 'nation-fra' }];
		const fra = { roleId: 'nation-fra' };
		expect(wishStatus({ wishes, target: fra })).toEqual({ rank: 1 });
		expect(wishStatus({ wishes: [], target: fra })).toEqual({ rank: undefined });
		expect(wishStatus({ wishes: undefined, target: fra })).toBeUndefined();
		expect(wishStatus({ wishes, target: { roleId: null } })).toBeUndefined();
	});

	it('borders a card by what matters most', () => {
		const review = { flagged: true, disqualified: true };
		expect(cardBorder({ review, pending: true })).toBe('border-error');
		expect(cardBorder({ review: { ...review, disqualified: false }, pending: true })).toBe(
			'border-warning'
		);
		expect(cardBorder({ review: undefined, pending: true })).toBe('border-primary border-dashed');
		expect(cardBorder({ review: undefined, pending: false })).toBe('border-base-300');
	});
});
