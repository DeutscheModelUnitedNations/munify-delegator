/**
 * The groups the team decides on together (`conference.maxCollectiveGroupSize`): per supervisor
 * and school, the students who applied. Up to the limit they all get a seat or none; a bigger group
 * is treated like everyone else, so it is not one. Pure, so it is tested without the database.
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

/**
 * The groups of at most `limit` students, by school name. A student with two supervisors is in
 * two groups; one without a supervisor or a school is not handed in. No limit, no groups.
 */
export function collectiveGroups({
	students,
	limit
}: {
	students: readonly SupervisedStudent[];
	limit: number | null;
}): CollectiveGroup[] {
	if (limit === null) return [];
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
	return [...groups.values()]
		.filter((group) => group.size <= limit)
		.sort((a, b) => a.school.name.localeCompare(b.school.name) || a.key.localeCompare(b.key));
}
