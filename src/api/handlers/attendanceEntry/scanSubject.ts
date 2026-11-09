type Rows = readonly { id: string }[];

/**
 * Why a scanned user's attendance cannot be recorded in a conference: they are not registered in
 * it as delegate, single participant or supervisor (`notInConference`), or only on its team
 * (`teamMember`), who have no participant row. Undefined when it can.
 */
export function scanSubjectProblem(
	subject:
		| {
				delegationMemberships: Rows;
				singleParticipant: Rows;
				conferenceSupervisor: Rows;
				teamMember: Rows;
		  }
		| undefined
) {
	if (!subject) return 'notInConference';
	const parts = [
		subject.delegationMemberships,
		subject.singleParticipant,
		subject.conferenceSupervisor
	];
	if (parts.some((part) => part.length > 0)) return undefined;
	return subject.teamMember.length > 0 ? 'teamMember' : 'notInConference';
}
