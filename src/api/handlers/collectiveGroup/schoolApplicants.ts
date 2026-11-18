import type { GroupSchool } from './collectiveGroups';

/**
 * The people of a conference who applied, by their own school: delegation members and single
 * participants. Only schools with more than one applicant: one person cannot get two results.
 * Pure, so it is tested without the database.
 */

export interface SchoolApplicants {
	school: GroupSchool;
	/** Delegation members, with the delegation that applied */
	members: { delegationMemberId: string; delegationId: string }[];
	singleParticipantIds: string[];
	size: number;
}

type Applicant = { school: GroupSchool } & (
	{ delegationMemberId: string; delegationId: string } | { singleParticipantId: string }
);

/** The applicants grouped by school, by school name. */
export function schoolApplicants(applicants: readonly Applicant[]): SchoolApplicants[] {
	const bySchool = new Map<string, SchoolApplicants>();
	for (const applicant of applicants) {
		const entry = bySchool.get(applicant.school.id) ?? {
			school: applicant.school,
			members: [],
			singleParticipantIds: [],
			size: 0
		};
		if ('delegationMemberId' in applicant) {
			entry.members.push({
				delegationMemberId: applicant.delegationMemberId,
				delegationId: applicant.delegationId
			});
		} else entry.singleParticipantIds.push(applicant.singleParticipantId);
		entry.size += 1;
		bySchool.set(applicant.school.id, entry);
	}
	return [...bySchool.values()]
		.filter((entry) => entry.size > 1)
		.sort(
			(a, b) => a.school.name.localeCompare(b.school.name) || a.school.id.localeCompare(b.school.id)
		);
}
