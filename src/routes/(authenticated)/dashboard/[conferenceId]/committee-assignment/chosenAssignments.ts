/**
 * The committee picked for each member, as the mutation takes it; undefined while a member has
 * none picked yet, since every member has to be sent at once.
 */
export function chosenAssignments(
	members: readonly { delegationMemberId: string; committeeId: string | null }[]
) {
	const assignments: { delegationMemberId: string; committeeId: string }[] = [];
	for (const { delegationMemberId, committeeId } of members) {
		if (!committeeId) return undefined;
		assignments.push({ delegationMemberId, committeeId });
	}
	return assignments;
}
