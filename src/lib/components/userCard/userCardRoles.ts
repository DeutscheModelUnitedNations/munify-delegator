import { client } from '#lib/api/rumbleClient/client.js';

/**
 * The filters for one person's rows in one conference: `forUser` for tables naming them directly
 * (team members), `registrationOfUser` for registrations, which reach the conference and the user
 * through their participant row.
 */
function userInConference(userId: string, conferenceId: string) {
	return {
		forUser: { where: { conferenceId: { eq: conferenceId }, userId: { eq: userId } } },
		registrationOfUser: {
			where: { conference: { id: { eq: conferenceId } }, user: { id: { eq: userId } } }
		}
	};
}

/**
 * Who someone is in one conference: their name, which registrations they hold there, their
 * participant row and waiting list entry, and the conference's state.
 *
 * This is what the user card's header renders and what decides which tabs it offers. Every tab
 * fetches the rest of what it shows on its own, once it is opened.
 */
export async function fetchUserCardRoles(userId: string, conferenceId: string) {
	const { forUser, registrationOfUser } = userInConference(userId, conferenceId);

	const [
		user,
		delegationMembers,
		singleParticipants,
		conferenceSupervisors,
		teamMembers,
		participants,
		waitingListEntries,
		conference
	] = await Promise.all([
		client.liveQuery.user({
			__args: { id: userId },
			id: true,
			givenName: true,
			familyName: true,
			pronouns: true,
			gender: true
		}),
		client.liveQuery.delegationMembers({
			__args: registrationOfUser,
			id: true,
			isHeadDelegate: true,
			assignedCommittee: { id: true, abbreviation: true },
			delegation: {
				id: true,
				applied: true,
				assignedRole: {
					id: true,
					kind: true,
					name: true,
					fontAwesomeIcon: true,
					nation: { alpha2Code: true, alpha3Code: true }
				}
			}
		}),
		client.liveQuery.singleParticipants({
			__args: registrationOfUser,
			id: true,
			applied: true,
			assignedRole: { id: true, name: true, fontAwesomeIcon: true }
		}),
		client.liveQuery.conferenceSupervisors({
			__args: registrationOfUser,
			id: true,
			supervisedDelegationMembers: {
				id: true,
				delegation: { id: true, assignedRole: { id: true } }
			},
			supervisedSingleParticipants: { id: true, assignedRole: { id: true } }
		}),
		client.liveQuery.teamMembers({ __args: forUser, id: true, role: true }),
		client.liveQuery.conferenceParticipants({ __args: forUser, id: true, didAttend: true }),
		client.liveQuery.waitingListEntries({ __args: forUser, id: true, assigned: true }),
		client.liveQuery.conference({ __args: { id: conferenceId }, id: true, state: true })
	]);

	// Handed back as the live results themselves: they only stay live while they are read inside
	// the caller's reactive context, so picking the one row out of each happens there.
	return {
		user,
		delegationMembers,
		singleParticipants,
		conferenceSupervisors,
		teamMembers,
		participants,
		waitingListEntries,
		conference
	};
}

type Roles = Awaited<ReturnType<typeof fetchUserCardRoles>>;

/** The single registration of each kind a person can hold in one conference. */
export type UserCardRoles = {
	delegationMember: Roles['delegationMembers'][number] | undefined;
	singleParticipant: Roles['singleParticipants'][number] | undefined;
	conferenceSupervisor: Roles['conferenceSupervisors'][number] | undefined;
	teamMember: Roles['teamMembers'][number] | undefined;
};

/** A registration as far as access is concerned: whether it holds a role. */
interface MaybeAssigned {
	assignedRole?: object | null;
}

/** What `hasConferenceAccess` reads of the registrations in `UserCardRoles`. */
interface AccessRoles {
	delegationMember?: { delegation: MaybeAssigned } | null;
	singleParticipant?: MaybeAssigned | null;
	conferenceSupervisor?: {
		supervisedDelegationMembers: readonly { delegation: MaybeAssigned }[];
		supervisedSingleParticipants: readonly MaybeAssigned[];
	} | null;
	teamMember?: object | null;
}

/**
 * Whether the person has a confirmed place at the conference: a team member, an assigned
 * delegation member or single participant, or a supervisor of at least one of those.
 */
export function hasConferenceAccess({
	delegationMember,
	singleParticipant,
	conferenceSupervisor,
	teamMember
}: AccessRoles) {
	if (teamMember) return true;
	if (delegationMember?.delegation.assignedRole) return true;
	if (singleParticipant?.assignedRole) return true;
	return !!conferenceSupervisor && supervisesAnyAssigned(conferenceSupervisor);
}

/** How far a delegate or single participant has come in the conference, or someone waiting. */
export type ParticipationStage =
	'waitingList' | 'registered' | 'applied' | 'notSeated' | 'seated' | 'attended';

/** States in which the assignment has happened, so an application without a role has none. */
const AFTER_ASSIGNMENT = new Set(['PREPARATION', 'ACTIVE', 'POST']);

/**
 * The stage the header shows for someone applying for a seat. Undefined for the team, supervisors
 * and anybody else without an application or a waiting list entry.
 */
export function participationStage({
	application,
	waitingListEntry,
	didAttend,
	conferenceState
}: {
	/** The delegation's or the single participant's application */
	application?: { applied: boolean; assignedRole?: object | null } | null;
	waitingListEntry?: { assigned: boolean } | null;
	didAttend?: boolean;
	conferenceState: string;
}): ParticipationStage | undefined {
	if (application?.assignedRole) return didAttend ? 'attended' : 'seated';
	if (application?.applied) return AFTER_ASSIGNMENT.has(conferenceState) ? 'notSeated' : 'applied';
	if (application) return 'registered';
	if (waitingListEntry && !waitingListEntry.assigned) return 'waitingList';
	return undefined;
}

function supervisesAnyAssigned(supervisor: NonNullable<AccessRoles['conferenceSupervisor']>) {
	return (
		supervisor.supervisedDelegationMembers.some((dm) => dm.delegation.assignedRole) ||
		supervisor.supervisedSingleParticipants.some((sp) => sp.assignedRole)
	);
}
