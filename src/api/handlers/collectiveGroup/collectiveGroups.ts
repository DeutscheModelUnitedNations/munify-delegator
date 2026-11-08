/**
 * The groups the team decides on together (`conference.maxCollectiveGroupSize`): per supervisor
 * and school, the students who applied. A delegation is decided on as a whole anyway, so one
 * supervised member brings in every member of it from the same school: a supervisor linked only to
 * the head delegates still counts the whole school's delegations, and cannot slip under the limit
 * that way. Up to the limit they all get a seat or none; a bigger group is treated like everyone
 * else, so it is not one. Pure, so it is tested without the database.
 */

export interface GroupSchool {
	id: string;
	name: string;
	isForeignSchool: boolean;
}

/** One applied student of one supervisor: a delegation member or a single participant. */
export type SupervisedStudent = { supervisorId: string; school: GroupSchool } & (
	| { kind: 'member'; delegationMemberId: string; delegationId: string }
	| { kind: 'single'; singleParticipantId: string }
);

export interface CollectiveGroup {
	/** The supervisor and the school, as one key */
	key: string;
	supervisorId: string;
	school: GroupSchool;
	/** Delegation members, with the delegation whose review decides about them */
	members: { delegationMemberId: string; delegationId: string }[];
	singleParticipantIds: string[];
	size: number;
}

/** An applied delegation member with a school, whether supervised or not. */
export interface AppliedMember {
	delegationMemberId: string;
	delegationId: string;
	schoolId: string;
}

/**
 * The groups of at most `limit` students, by school name. A student with two supervisors is in
 * two groups; one without a supervisor or a school is not handed in. A supervised delegation
 * member brings in the other `members` of their delegation from the same school. No limit, no
 * groups.
 */
export function collectiveGroups({
	students,
	members = [],
	limit
}: {
	students: readonly SupervisedStudent[];
	members?: readonly AppliedMember[];
	limit: number | null;
}): CollectiveGroup[] {
	if (limit === null) return [];
	return [...groupsOf([...students, ...schoolmates({ students, members })]).values()]
		.filter((group) => group.size <= limit)
		.sort((a, b) => a.school.name.localeCompare(b.school.name) || a.key.localeCompare(b.key));
}

/**
 * The members of the supervised students' delegations from the same school, as students of the
 * same supervisor: the ones the supervision does not name itself.
 */
function schoolmates({
	students,
	members
}: {
	students: readonly SupervisedStudent[];
	members: readonly AppliedMember[];
}): SupervisedStudent[] {
	const byDelegation = Map.groupBy(members, (member) => member.delegationId);
	const named = new Set(
		students.flatMap((student) =>
			student.kind === 'member' ? `${student.supervisorId}:${student.delegationMemberId}` : []
		)
	);
	const added = new Set<string>();
	return students.flatMap((student) => {
		if (student.kind !== 'member') return [];
		return (byDelegation.get(student.delegationId) ?? []).flatMap((member): SupervisedStudent[] => {
			const key = `${student.supervisorId}:${member.delegationMemberId}`;
			if (member.schoolId !== student.school.id || named.has(key) || added.has(key)) return [];
			added.add(key);
			return [{ ...student, delegationMemberId: member.delegationMemberId }];
		});
	});
}

function groupsOf(students: readonly SupervisedStudent[]) {
	const groups = new Map<string, CollectiveGroup>();
	for (const student of students) {
		const key = `${student.supervisorId}:${student.school.id}`;
		const group = groups.get(key) ?? {
			key,
			supervisorId: student.supervisorId,
			school: student.school,
			members: [],
			singleParticipantIds: [],
			size: 0
		};
		if (student.kind === 'member') {
			group.members.push({
				delegationMemberId: student.delegationMemberId,
				delegationId: student.delegationId
			});
		} else group.singleParticipantIds.push(student.singleParticipantId);
		group.size += 1;
		groups.set(key, group);
	}
	return groups;
}
