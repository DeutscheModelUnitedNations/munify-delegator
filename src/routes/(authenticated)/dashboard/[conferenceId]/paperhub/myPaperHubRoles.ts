import { fetchMyParticipation } from '#lib/api/myConferenceParticipation';
import { client } from '#lib/api/rumbleClient/client';
import { PAPER_ROLES } from '#lib/helpers/teamRoles';
import { getCurrentUser } from '#lib/state/currentUser.svelte.js';
import { canOpenPaperHub, paperHubAccess } from './paperHubViews';

/**
 * The paper hub looks different for reviewers and for supervisors, so it asks for both.
 *
 * Live, so gaining a role or a supervised delegation shows up without a reload.
 */
export async function fetchMyPaperHubRoles(conferenceId: string) {
	const user = await getCurrentUser();
	const forUser = { conferenceId: { eq: conferenceId }, userId: { eq: user.sub } };
	// A supervisor reaches the conference and the user through its participant row.
	const forSupervisor = {
		conference: { id: { eq: conferenceId } },
		user: { id: { eq: user.sub } }
	};

	const [teamMembers, supervisors] = await Promise.all([
		client.liveQuery.teamMembers({
			__args: {
				// `role` is a plain enum in the API's filter, not a where-input, and a sibling of
				// `OR` does not constrain its branches - so each alternative repeats the scope.
				where: { OR: PAPER_ROLES.map((role) => ({ role, ...forUser })) }
			},
			role: true
		}),
		client.liveQuery.conferenceSupervisors({
			__args: { where: forSupervisor },
			id: true,
			supervisedDelegationMembers: { delegation: { id: true } }
		})
	]);

	// Getters rather than values computed once here: they read through the live lists on every
	// access, which is what carries a later update to the page.
	return {
		/** An admin reviews like the team: the team navigation offers them the hub, too. */
		get isReviewer() {
			return user.isAdmin || teamMembers.length > 0;
		},
		/** Project management (or an admin) may delete any paper, not just a draft of their own. */
		get mayDeleteAnyPaper() {
			return user.isAdmin || teamMembers.some((member) => member.role === 'PROJECT_MANAGEMENT');
		},
		get supervisor() {
			return supervisors.at(0) ?? null;
		},
		get supervisedDelegationIds() {
			const supervisor = supervisors.at(0);
			return [
				...new Set(supervisor?.supervisedDelegationMembers.map((m) => m.delegation.id) ?? [])
			];
		}
	};
}

/** Whether the paper hub belongs in the caller's navigation: a snapshot, not a live value. */
export async function fetchCanOpenPaperHub(conferenceId: string) {
	const [participation, roles] = await Promise.all([
		fetchMyParticipation(conferenceId),
		fetchMyPaperHubRoles(conferenceId)
	]);
	return canOpenPaperHub(paperHubAccess({ participation, roles }));
}
