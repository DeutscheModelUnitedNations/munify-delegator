import { describe, expect, test } from 'vitest';
import {
	collectiveGroupProblems,
	collectiveGroups,
	collectiveGroupsOf,
	guaranteedSeatsAbroad,
	guaranteesAround,
	guaranteesOverLimit,
	schoolRuleBreaches,
	seatedPeople,
	type SupervisedStudents
} from './schoolRules';

const kiel = { id: 'kiel', name: 'Gymnasium Kiel', isForeignSchool: false };
const luebeck = { id: 'luebeck', name: 'Schule Lübeck', isForeignSchool: false };
const madrid = { id: 'madrid', name: 'Deutsche Schule Madrid', isForeignSchool: true };
const rom = { id: 'rom', name: 'Deutsche Schule Rom', isForeignSchool: true };

const member = ({
	id,
	delegationId,
	school,
	applied = true
}: {
	id: string;
	delegationId: string;
	school: typeof kiel | null;
	applied?: boolean;
}) => ({ id, delegation: { id: delegationId, applied }, school });

const single = ({
	id,
	school,
	applied = true
}: {
	id: string;
	school: typeof kiel | null;
	applied?: boolean;
}) => ({ id, applied, school });

const supervisor = (
	id: string,
	{
		members = [],
		singles = []
	}: {
		members?: SupervisedStudents['supervisedDelegationMembers'];
		singles?: SupervisedStudents['supervisedSingleParticipants'];
	}
): SupervisedStudents => ({
	id,
	supervisedDelegationMembers: members,
	supervisedSingleParticipants: singles
});

const none = { delegationIds: new Set<string>(), singleParticipantIds: new Set<string>() };

describe('collectiveGroups', () => {
	const anna = supervisor('anna', {
		members: [
			member({ id: 'm1', delegationId: 'd1', school: kiel }),
			member({ id: 'm2', delegationId: 'd1', school: kiel }),
			member({ id: 'm3', delegationId: 'd2', school: luebeck }),
			// not applied yet: not part of the assignment
			member({ id: 'm4', delegationId: 'd3', school: kiel, applied: false }),
			member({ id: 'm5', delegationId: 'd4', school: null })
		],
		singles: [
			single({ id: 's1', school: kiel }),
			single({ id: 's2', school: kiel, applied: false })
		]
	});

	test('groups the applied students of one supervisor by school', () => {
		const groups = collectiveGroups({ supervisors: [anna], limit: 16 });
		expect(groups.map((group) => [group.key, group.size])).toEqual([
			['anna:kiel', 3],
			['anna:luebeck', 1]
		]);
		expect(groups[0].members).toEqual([
			{ id: 'm1', delegationId: 'd1' },
			{ id: 'm2', delegationId: 'd1' }
		]);
		expect(groups[0].singleParticipantIds).toEqual(['s1']);
	});

	test('leaves groups larger than the limit to the regular assignment', () => {
		expect(collectiveGroups({ supervisors: [anna], limit: 2 }).map((group) => group.key)).toEqual([
			'anna:luebeck'
		]);
		// up to the limit, inclusive
		expect(collectiveGroups({ supervisors: [anna], limit: 3 })).toHaveLength(2);
	});

	test('has no groups without a limit', () => {
		expect(collectiveGroups({ supervisors: [anna], limit: null })).toEqual([]);
	});

	test('puts a student with two supervisors into both of their groups', () => {
		const shared = member({ id: 'm1', delegationId: 'd1', school: kiel });
		const groups = collectiveGroups({
			supervisors: [
				supervisor('anna', { members: [shared] }),
				supervisor('ben', { members: [shared] })
			],
			limit: 16
		});
		expect(groups.map((group) => group.key)).toEqual(['anna:kiel', 'ben:kiel']);
	});
});

describe('collectiveGroupProblems', () => {
	const [group] = collectiveGroups({
		supervisors: [
			supervisor('anna', {
				members: [
					member({ id: 'm1', delegationId: 'd1', school: kiel }),
					member({ id: 'm2', delegationId: 'd1', school: kiel }),
					member({ id: 'm3', delegationId: 'd2', school: kiel })
				],
				singles: [single({ id: 's1', school: kiel })]
			})
		],
		limit: 16
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
	const groups = collectiveGroups({
		supervisors: [
			supervisor('anna', {
				members: [member({ id: 'm1', delegationId: 'd1', school: kiel })],
				singles: [single({ id: 's1', school: luebeck })]
			})
		],
		limit: 16
	});
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
});

test('schoolRuleBreaches checks both rules against the plan and the sighting', () => {
	const supervisors = [
		supervisor('anna', {
			members: [
				member({ id: 'm1', delegationId: 'd1', school: madrid }),
				member({ id: 'm2', delegationId: 'd2', school: madrid })
			]
		})
	];
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
	const breaches = schoolRuleBreaches({
		supervisors,
		reviews,
		groupLimit: 16,
		guaranteeLimit: 1,
		plan
	});
	expect(breaches.splitGroups.map((problem) => [problem.seated, problem.disqualified])).toEqual([
		[1, 1]
	]);
	expect(breaches.overGuarantee).toEqual([{ school: madrid, seats: 2 }]);
	// switched off, neither rule warns
	expect(
		schoolRuleBreaches({ supervisors, reviews, groupLimit: null, guaranteeLimit: null, plan })
	).toEqual({ splitGroups: [], overGuarantee: [] });
});
