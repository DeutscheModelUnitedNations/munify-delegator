import { client } from '$lib/api/rumbleClient/client';

/**
 * Who someone is in one conference: their name, and which registrations they hold there.
 *
 * This is what the user card's header renders and what decides which tabs it offers. Every tab
 * fetches the rest of what it shows on its own, once it is opened.
 */
export async function fetchUserCardRoles(userId: string, conferenceId: string) {
	const forUser = { where: { conferenceId: { eq: conferenceId }, userId: { eq: userId } } };

	const [user, delegationMembers, singleParticipants, conferenceSupervisors, teamMembers] =
		await Promise.all([
			client.liveQuery.user({
				__args: { id: userId },
				id: true,
				givenName: true,
				familyName: true,
				pronouns: true,
				gender: true
			}),
			client.liveQuery.delegationMembers({
				__args: forUser,
				id: true,
				isHeadDelegate: true,
				assignedCommittee: { id: true, abbreviation: true },
				delegation: {
					id: true,
					assignedNation: { alpha2Code: true, alpha3Code: true },
					assignedNonStateActor: { id: true, name: true, fontAwesomeIcon: true }
				}
			}),
			client.liveQuery.singleParticipants({
				__args: forUser,
				id: true,
				applied: true,
				assignedRole: { id: true, name: true, fontAwesomeIcon: true }
			}),
			client.liveQuery.conferenceSupervisors({
				__args: forUser,
				id: true,
				supervisedDelegationMembers: {
					id: true,
					delegation: {
						id: true,
						assignedNation: { alpha2Code: true },
						assignedNonStateActor: { id: true }
					}
				},
				supervisedSingleParticipants: { id: true, assignedRole: { id: true } }
			}),
			client.liveQuery.teamMembers({ __args: forUser, id: true, role: true })
		]);

	// Handed back as the live results themselves: they only stay live while they are read inside
	// the caller's reactive context, so picking the one row out of each happens there.
	return { user, delegationMembers, singleParticipants, conferenceSupervisors, teamMembers };
}

type Roles = Awaited<ReturnType<typeof fetchUserCardRoles>>;

/** The single registration of each kind a person can hold in one conference. */
export type UserCardRoles = {
	delegationMember: Roles['delegationMembers'][number] | undefined;
	singleParticipant: Roles['singleParticipants'][number] | undefined;
	conferenceSupervisor: Roles['conferenceSupervisors'][number] | undefined;
	teamMember: Roles['teamMembers'][number] | undefined;
};

/**
 * Whether the person has a confirmed place at the conference: a team member, an assigned
 * delegation member or single participant, or a supervisor of at least one of those.
 */
export function hasConferenceAccess({
	delegationMember,
	singleParticipant,
	conferenceSupervisor,
	teamMember
}: UserCardRoles) {
	if (teamMember) return true;
	if (
		delegationMember &&
		(delegationMember.delegation.assignedNation ||
			delegationMember.delegation.assignedNonStateActor)
	)
		return true;
	if (singleParticipant?.assignedRole) return true;
	if (conferenceSupervisor) {
		const anyDelegationAssigned = conferenceSupervisor.supervisedDelegationMembers.some(
			(dm) => dm.delegation.assignedNation || dm.delegation.assignedNonStateActor
		);
		const anySingleAssigned = conferenceSupervisor.supervisedSingleParticipants.some(
			(sp) => sp.assignedRole
		);
		if (anyDelegationAssigned || anySingleAssigned) return true;
	}
	return false;
}
