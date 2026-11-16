import { seatedPeople, type PlannedSeats, type RuleSchool } from '../schoolRules';

/**
 * Schools whose applicants the plan would treat differently: some get a seat, others none. Not a
 * rule (unlike the groups decided together in `schoolRules.ts`), often fine, so the summary only
 * mentions it. Pure.
 */

/** The applicants of one school, as the API's `schoolApplicants` answers them. */
export interface SchoolApplicantsOf {
	school: RuleSchool;
	members: readonly { delegationMemberId: string; delegationId: string }[];
	singleParticipantIds: readonly string[];
	size: number;
}

/** A school with mixed results, and its applications on either side. */
export interface MixedSchoolOutcome {
	school: RuleSchool;
	/** How many of its people would hold a seat */
	seated: number;
	size: number;
	/** Applications (delegations, single participants) with a seat for its people */
	acceptedApplicationIds: string[];
	/** Applications with people of it left without a seat */
	declinedApplicationIds: string[];
}

/**
 * The schools the plan would split. Counted per person: a split delegation can put its school's
 * people on both sides, and is then listed on both.
 */
export function mixedSchoolOutcomes({
	schools,
	plan
}: {
	schools: readonly SchoolApplicantsOf[];
	plan: PlannedSeats;
}): MixedSchoolOutcome[] {
	const seated = seatedPeople(plan);
	return schools.flatMap((entry) => {
		const accepted = new Set<string>();
		const declined = new Set<string>();
		for (const member of entry.members) {
			const side = seated.members.has(member.delegationMemberId) ? accepted : declined;
			side.add(member.delegationId);
		}
		for (const id of entry.singleParticipantIds) {
			(seated.singles.has(id) ? accepted : declined).add(id);
		}
		if (accepted.size === 0 || declined.size === 0) return [];
		const seatedCount =
			entry.members.filter((member) => seated.members.has(member.delegationMemberId)).length +
			entry.singleParticipantIds.filter((id) => seated.singles.has(id)).length;
		return [
			{
				school: entry.school,
				seated: seatedCount,
				size: entry.size,
				acceptedApplicationIds: [...accepted],
				declinedApplicationIds: [...declined]
			}
		];
	});
}
