/**
 * Whether the team may place one more person into the delegation holding a role: the role seats
 * only so many people (`roleSeats`), and a committee only so many of one delegation. Answers what
 * is full, or undefined when the person fits.
 */
export function placementProblem({
	roleSeats,
	members,
	committee
}: {
	roleSeats: number;
	/** The delegation's members before the placement, with the committee each sits in. */
	members: readonly { assignedCommitteeId: string | null }[];
	/** The committee the person is placed into, if any. */
	committee?: { id: string; numOfSeatsPerDelegation: number } | null;
}): 'roleFull' | 'committeeFull' | undefined {
	if (members.length >= roleSeats) return 'roleFull';
	if (!committee) return undefined;
	const inCommittee = members.filter((member) => member.assignedCommitteeId === committee.id);
	return inCommittee.length >= committee.numOfSeatsPerDelegation ? 'committeeFull' : undefined;
}

/**
 * What of a person's part in a conference the team clears to seat them elsewhere: their
 * delegation membership or single registration. A supervisor or team member cannot be moved into
 * a seat (`refused`).
 */
export function partToClear({
	participant,
	isTeamMember
}: {
	participant:
		| {
				delegationMember?: { id: string } | null;
				singleParticipant?: { id: string } | null;
				conferenceSupervisor?: { id: string } | null;
		  }
		| undefined;
	isTeamMember: boolean;
}) {
	if (isTeamMember || participant?.conferenceSupervisor) return { kind: 'refused' } as const;
	if (participant?.delegationMember) {
		return { kind: 'member', id: participant.delegationMember.id } as const;
	}
	if (participant?.singleParticipant) {
		return { kind: 'single', id: participant.singleParticipant.id } as const;
	}
	return { kind: 'none' } as const;
}

/**
 * Who leaves `committee` for the seat `member` is leaving, when it already seats as many of the
 * delegation as it may: the occupant left untouched longest. Undefined while there is room.
 */
export function displacedBy<
	M extends { id: string; assignedCommitteeId?: string | null; updatedAt: Date }
>({
	member,
	members,
	committee
}: {
	member: { id: string };
	members: readonly M[];
	committee: { id: string; numOfSeatsPerDelegation: number };
}) {
	const occupying = members.filter(
		(other) => other.id !== member.id && other.assignedCommitteeId === committee.id
	);
	if (occupying.length < committee.numOfSeatsPerDelegation) return undefined;
	return occupying.toSorted((a, b) => a.updatedAt.getTime() - b.updatedAt.getTime())[0];
}
