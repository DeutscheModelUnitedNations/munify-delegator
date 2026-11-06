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
});
