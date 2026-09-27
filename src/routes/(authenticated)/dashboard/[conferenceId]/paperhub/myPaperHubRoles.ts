import { client } from '$lib/api/rumbleClient/client';
import { getCurrentUser } from '$lib/state/currentUser.svelte';

const REVIEW_ROLES = ['REVIEWER', 'PROJECT_MANAGEMENT', 'PARTICIPANT_CARE'] as const;

/**
 * The paper hub looks different for reviewers and for supervisors, so it asks for both.
 *
 * Live, so gaining a role or a supervised delegation shows up without a reload.
 */
export async function fetchMyPaperHubRoles(conferenceId: string) {
	const user = await getCurrentUser();
	const forUser = { conferenceId: { eq: conferenceId }, userId: { eq: user.sub } };

	const [teamMembers, supervisors] = await Promise.all([
		client.liveQuery.teamMembers({
			__args: {
				// `role` is a plain enum in the API's filter, not a where-input, and a sibling of
				// `OR` does not constrain its branches - so each alternative repeats the scope.
				where: { OR: REVIEW_ROLES.map((role) => ({ role, ...forUser })) }
			},
			id: true,
			role: true
		}),
		client.liveQuery.conferenceSupervisors({
			__args: { where: forUser },
			id: true,
			supervisedDelegationMembers: { delegation: { id: true } }
		})
	]);

	const supervisor = supervisors.at(0) ?? null;

	return {
		isReviewer: teamMembers.length > 0,
		supervisor,
		supervisedDelegationIds: [
			...new Set(supervisor?.supervisedDelegationMembers.map((m) => m.delegation.id) ?? [])
		]
	};
}
