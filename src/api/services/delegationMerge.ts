/**
 * How the assignment run merges the delegations assigned to one nation or non-state actor: the
 * smallest existing delegation becomes the carrier and keeps its members untouched; everyone else
 * is re-created on it, after the delegations they come from are removed.
 */
export function planDelegationMerge(
	assigned: { members: { user: { id: string } }[] }[],
	existing: { id: string; members: { userId: string }[] }[]
) {
	const primary = [...existing].sort((a, b) => a.members.length - b.members.length).at(0);
	const kept = new Set(primary?.members.map((member) => member.userId));
	const userIds = assigned
		.flatMap((delegation) => delegation.members.map((member) => member.user.id))
		.filter((id) => !kept.has(id));

	return {
		/** The carrier, or undefined when a brand new delegation has to carry the role. */
		primaryId: primary?.id,
		/** Without an existing carrier there is nothing the users could be moved away from. */
		leavingUserIds: primary ? userIds : [],
		/** A brand new delegation needs a head delegate; an existing one already has one. */
		newMembers: userIds.map((userId, index) => ({
			userId,
			isHeadDelegate: !primary && index === 0
		}))
	};
}

/** Every supervisor-member pair of a delegation, for restoring links after members are recreated. */
export function supervisionLinks(
	delegation: { members: { id: string; supervisors?: { id: string }[] | null }[] } | undefined
) {
	return (delegation?.members ?? []).flatMap((member) =>
		(member.supervisors ?? []).map((supervisor) => ({
			supervisorId: supervisor.id,
			memberId: member.id
		}))
	);
}
