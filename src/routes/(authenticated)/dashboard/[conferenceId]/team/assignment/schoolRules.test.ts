import { describe, expect, test } from 'vitest';
import {
	collectiveGroupProblems,
	collectiveGroupsOf,
	guaranteedSeatsAbroad,
	guaranteesAround,
	guaranteesOverLimit,
	guaranteeShare,
	guaranteeShareAround,
	schoolRuleBreaches,
	seatedPeople,
	type CollectiveGroup
} from './schoolRules';

const kiel = { id: 'kiel', name: 'Gymnasium Kiel', isForeignSchool: false };
const luebeck = { id: 'luebeck', name: 'Schule Lübeck', isForeignSchool: false };
const madrid = { id: 'madrid', name: 'Deutsche Schule Madrid', isForeignSchool: true };
const rom = { id: 'rom', name: 'Deutsche Schule Rom', isForeignSchool: true };

/** A group as the API answers it: members as `memberId:delegationId`. */
const groupOf = ({
	supervisorId = 'anna',
	school,
	members = [],
	singleParticipantIds = []
}: {
	supervisorId?: string;
	school: typeof kiel;
	members?: string[];
	singleParticipantIds?: string[];
}): CollectiveGroup => ({
	key: `${supervisorId}:${school.id}`,
	supervisorId,
	school,
	members: members.map((pair) => {
		const [delegationMemberId, delegationId] = pair.split(':');
		return { delegationMemberId, delegationId };
	}),
	singleParticipantIds,
	size: members.length + singleParticipantIds.length
});

const none = { delegationIds: new Set<string>(), singleParticipantIds: new Set<string>() };

describe('collectiveGroupProblems', () => {
	const group = groupOf({
		school: kiel,
		members: ['m1:d1', 'm2:d1', 'm3:d2'],
		singleParticipantIds: ['s1']
	});
	const seatedGroup = (memberIds: string[], roleId: string | null = 'deu') => ({
		memberIds,
		singleParticipantId: null,
		target: { roleId }
	});

	test('is fine with a group seated as a whole, or not at all', () => {
		const all = {
			groups: [seatedGroup(['m1', 'm2']), seatedGroup(['m3'], 'fra')],
			singles: [{ singleParticipantId: 's1', roleId: 'press' }]
		};
		expect(collectiveGroupProblems({ groups: [group], state: all, disqualified: none })).toEqual(
			[]
		);
		const nobody = { groups: [seatedGroup(['m1', 'm2'], null)], singles: [] };
		expect(collectiveGroupProblems({ groups: [group], state: nobody, disqualified: none })).toEqual(
			[]
		);
	});

	test('names a group the plan seats only partly', () => {
		const state = { groups: [seatedGroup(['m1', 'm2'])], singles: [] };
		expect(collectiveGroupProblems({ groups: [group], state, disqualified: none })).toEqual([
			{ group, seated: 2, disqualified: 0, unseatedApplicationIds: ['d2', 's1'] }
		]);
	});

	test('counts a converted single participant by the role of their delegation', () => {
		const state = {
			groups: [
				seatedGroup(['m1', 'm2', 'm3']),
				{ memberIds: [], singleParticipantId: 's1', target: { roleId: 'deu' } }
			],
			singles: []
		};
		expect(collectiveGroupProblems({ groups: [group], state, disqualified: none })).toEqual([]);
	});

	test('names a group the sighting excluded only partly', () => {
		const state = { groups: [], singles: [] };
		const someExcluded = {
			delegationIds: new Set(['d2']),
			singleParticipantIds: new Set<string>()
		};
		expect(collectiveGroupProblems({ groups: [group], state, disqualified: someExcluded })).toEqual(
			[{ group, seated: 0, disqualified: 1, unseatedApplicationIds: ['d1', 'd2', 's1'] }]
		);
		const allExcluded = {
			delegationIds: new Set(['d1', 'd2']),
			singleParticipantIds: new Set(['s1'])
		};
		expect(collectiveGroupProblems({ groups: [group], state, disqualified: allExcluded })).toEqual(
			[]
		);
	});
});

test('seatedPeople takes the members and single participants holding a role', () => {
	const seated = seatedPeople({
		groups: [
			{ memberIds: ['m1'], singleParticipantId: null, target: { roleId: 'deu' } },
			{ memberIds: ['m2'], singleParticipantId: null, target: { roleId: null } }
		],
		singles: [
			{ singleParticipantId: 's1', roleId: 'press' },
			{ singleParticipantId: 's2', roleId: null }
		]
	});
	expect([...seated.members]).toEqual(['m1']);
	expect([...seated.singles]).toEqual(['s1']);
});

test('collectiveGroupsOf finds the groups of a delegation or a single participant', () => {
	const groups = [
		groupOf({ school: kiel, members: ['m1:d1'] }),
		groupOf({ school: luebeck, singleParticipantIds: ['s1'] })
	];
	const keys = (application: Parameters<typeof collectiveGroupsOf>[0]['application']) =>
		collectiveGroupsOf({ groups, application }).map((group) => group.key);
	expect(keys({ delegationId: 'd1' })).toEqual(['anna:kiel']);
	expect(keys({ singleParticipantId: 's1' })).toEqual(['anna:luebeck']);
	expect(keys({ delegationId: 'd2' })).toEqual([]);
});

describe('guaranteed seats abroad', () => {
	const delegation = (id: string, schools: (typeof kiel | null)[]) => ({
		delegationId: id,
		delegation: { members: schools.map((school) => ({ school })) }
	});
	const singleApplication = (id: string, school: typeof kiel | null) => ({
		singleParticipantId: id,
		singleParticipant: { school }
	});
	const required = [
		delegation('d1', [madrid, madrid, kiel]),
		delegation('d2', [rom, null]),
		singleApplication('s1', madrid),
		singleApplication('s2', luebeck)
	];

	test('counts every person of a required application for their own Auslandsschule', () => {
		expect(guaranteedSeatsAbroad(required)).toEqual([
			{ school: madrid, seats: 3 },
			{ school: rom, seats: 1 }
		]);
	});

	test('names the schools past the limit, none without one', () => {
		const counts = guaranteedSeatsAbroad(required);
		expect(guaranteesOverLimit({ counts, limit: 2 })).toEqual([{ school: madrid, seats: 3 }]);
		expect(guaranteesOverLimit({ counts, limit: 3 })).toEqual([]);
		expect(guaranteesOverLimit({ counts, limit: null })).toEqual([]);
	});

	test('shows what marking an application required or not would make of its schools', () => {
		const d3 = delegation('d3', [madrid, rom, kiel]);
		expect(guaranteesAround({ applications: required, application: d3, required: true })).toEqual([
			{ school: madrid, seats: 4 },
			{ school: rom, seats: 2 }
		]);
		expect(guaranteesAround({ applications: required, application: d3, required: false })).toEqual([
			{ school: madrid, seats: 3 },
			{ school: rom, seats: 1 }
		]);
		// already stored as required: not counted twice, and taken back once unmarked
		const d1 = required[0];
		expect(guaranteesAround({ applications: required, application: d1, required: true })).toEqual([
			{ school: madrid, seats: 3 }
		]);
		expect(guaranteesAround({ applications: required, application: d1, required: false })).toEqual([
			{ school: madrid, seats: 1 }
		]);
		// a school abroad nobody else has a guaranteed seat at
		expect(
			guaranteesAround({
				applications: [],
				application: singleApplication('s3', rom),
				required: false
			})
		).toEqual([{ school: rom, seats: 0 }]);
	});

	test('sums the Auslandsschulen against their share of all seats, rounded down', () => {
		const counts = guaranteedSeatsAbroad(required);
		expect(guaranteeShare({ counts, capacity: 22, percent: 20 })).toEqual({
			seats: 4,
			allowed: 4,
			capacity: 22,
			percent: 20
		});
		// no limit, or no seats planned yet: nothing to measure against
		expect(guaranteeShare({ counts, capacity: 22, percent: null })).toBeNull();
		expect(guaranteeShare({ counts, capacity: 0, percent: 20 })).toBeNull();
	});

	test('shows the share around an application with people of an Auslandsschule only', () => {
		const share = { capacity: 20, percent: 20 };
		const d3 = delegation('d3', [madrid, kiel]);
		expect(
			guaranteeShareAround({ applications: required, application: d3, required: true, ...share })
		).toMatchObject({ seats: 5, allowed: 4 });
		expect(
			guaranteeShareAround({ applications: required, application: d3, required: false, ...share })
		).toMatchObject({ seats: 4 });
		expect(
			guaranteeShareAround({
				applications: required,
				application: singleApplication('s3', kiel),
				required: true,
				...share
			})
		).toBeNull();
	});
});

test('schoolRuleBreaches checks both rules against the plan and the sighting', () => {
	const groups = [groupOf({ school: madrid, members: ['m1:d1', 'm2:d2'] })];
	const reviews = [
		{
			delegationId: 'd1',
			required: true,
			disqualified: false,
			delegation: { members: [{ school: madrid }, { school: madrid }] }
		},
		{ delegationId: 'd2', required: false, disqualified: true, delegation: { members: [] } }
	];
	const plan = {
		groups: [{ memberIds: ['m1'], singleParticipantId: null, target: { roleId: 'deu' } }],
		singles: []
	};
	const limits = { sharePercent: 10, capacity: 10 };
	const breaches = schoolRuleBreaches({ groups, reviews, guaranteeLimit: 1, ...limits, plan });
	expect(breaches.splitGroups.map((problem) => [problem.seated, problem.disqualified])).toEqual([
		[1, 1]
	]);
	expect(breaches.overGuarantee).toEqual([{ school: madrid, seats: 2 }]);
	expect(breaches.overShare).toEqual({ seats: 2, allowed: 1, capacity: 10, percent: 10 });
	// within the share: no warning about it
	expect(
		schoolRuleBreaches({ groups, reviews, guaranteeLimit: 1, sharePercent: 20, capacity: 10, plan })
			.overShare
	).toBeNull();
	// switched off (the API then answers no groups), no rule warns
	expect(
		schoolRuleBreaches({
			groups: [],
			reviews,
			guaranteeLimit: null,
			sharePercent: null,
			capacity: 10,
			plan
		})
	).toEqual({ splitGroups: [], overGuarantee: [], overShare: null });
});
