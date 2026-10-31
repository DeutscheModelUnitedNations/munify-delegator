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
