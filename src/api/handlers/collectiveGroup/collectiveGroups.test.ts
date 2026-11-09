import { describe, expect, test } from 'vitest';
import { collectiveGroups, type SupervisedStudent } from './collectiveGroups';

const kiel = { id: 'kiel', name: 'Gymnasium Kiel', isForeignSchool: false };
const luebeck = { id: 'luebeck', name: 'Schule Lübeck', isForeignSchool: false };

const member = ({
	supervisorId = 'anna',
	id,
	delegationId,
	school
}: {
	supervisorId?: string;
	id: string;
	delegationId: string;
	school: typeof kiel;
}): SupervisedStudent => ({
	supervisorId,
	school,
	kind: 'member',
	delegationMemberId: id,
	delegationId
});

const single = ({
	supervisorId = 'anna',
	id,
	school
}: {
	supervisorId?: string;
	id: string;
	school: typeof kiel;
}): SupervisedStudent => ({ supervisorId, school, kind: 'single', singleParticipantId: id });

describe('collectiveGroups', () => {
	const students = [
		member({ id: 'm1', delegationId: 'd1', school: kiel }),
		member({ id: 'm2', delegationId: 'd1', school: kiel }),
		member({ id: 'm3', delegationId: 'd2', school: luebeck }),
		single({ id: 's1', school: kiel })
	];

	test('groups the students of one supervisor by school', () => {
		const groups = collectiveGroups({ students, limit: 16 });
		expect(groups.map((group) => [group.key, group.size])).toEqual([
			['anna:kiel', 3],
			['anna:luebeck', 1]
		]);
		expect(groups[0].members).toEqual([
			{ delegationMemberId: 'm1', delegationId: 'd1' },
			{ delegationMemberId: 'm2', delegationId: 'd1' }
		]);
		expect(groups[0].singleParticipantIds).toEqual(['s1']);
	});

	test('leaves groups larger than the limit to the regular assignment', () => {
		expect(collectiveGroups({ students, limit: 2 }).map((group) => group.key)).toEqual([
			'anna:luebeck'
		]);
		// up to the limit, inclusive
		expect(collectiveGroups({ students, limit: 3 })).toHaveLength(2);
	});

	test('has no groups without a limit', () => {
		expect(collectiveGroups({ students, limit: null })).toEqual([]);
	});

	test('puts a student with two supervisors into both of their groups', () => {
		const groups = collectiveGroups({
			students: [
				member({ supervisorId: 'anna', id: 'm1', delegationId: 'd1', school: kiel }),
				member({ supervisorId: 'ben', id: 'm1', delegationId: 'd1', school: kiel })
			],
			limit: 16
		});
		expect(groups.map((group) => group.key)).toEqual(['anna:kiel', 'ben:kiel']);
	});

	describe('a supervised member brings in their delegation', () => {
		// the case from the team: a teacher linked only to the head delegates of their delegations
		const applied = (delegationId: string, school = kiel) =>
			[1, 2, 3, 4].map((n) => ({
				delegationMemberId: `${delegationId}-${n}`,
				delegationId,
				schoolId: school.id
			}));
		const heads = ['d1', 'd2', 'd3', 'd4', 'd5'].map((delegationId) =>
			member({ id: `${delegationId}-1`, delegationId, school: kiel })
		);
		const members = ['d1', 'd2', 'd3', 'd4', 'd5'].flatMap((id) => applied(id));

		test('counts every member of the school, not only the linked ones', () => {
			const [group] = collectiveGroups({ students: heads, members, limit: 20 });
			expect(group.size).toBe(20);
			expect(group.members).toContainEqual({ delegationMemberId: 'd3-4', delegationId: 'd3' });
		});

		test('so the group is past the limit and not decided together', () => {
			expect(collectiveGroups({ students: heads, members, limit: 16 })).toEqual([]);
			// counting the linked heads alone, it would have been
			expect(collectiveGroups({ students: heads, limit: 16 })).toHaveLength(1);
		});

		test('leaves out members of another school', () => {
			const mixed = [...applied('d1').slice(0, 2), ...applied('d1', luebeck).slice(2)];
			const [group] = collectiveGroups({
				students: [heads[0]],
				members: mixed,
				limit: 16
			});
			expect(group.members.map((m) => m.delegationMemberId)).toEqual(['d1-1', 'd1-2']);
		});

		test('counts a member linked as well as brought in once', () => {
			const [group] = collectiveGroups({
				students: [heads[0], member({ id: 'd1-2', delegationId: 'd1', school: kiel })],
				members: applied('d1'),
				limit: 16
			});
			expect(group.size).toBe(4);
		});

		test('brings them into the group of every supervisor of the delegation', () => {
			const groups = collectiveGroups({
				students: [
					heads[0],
					member({ supervisorId: 'ben', id: 'd1-2', delegationId: 'd1', school: kiel })
				],
				members: applied('d1'),
				limit: 16
			});
			expect(groups.map((group) => [group.key, group.size])).toEqual([
				['anna:kiel', 4],
				['ben:kiel', 4]
			]);
		});
	});
});
