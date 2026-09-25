import { client } from '$lib/api/rumbleClient/client';
import type { LayoutLoad } from './$types';

/** The paper hub looks different for reviewers and for supervisors, so it asks for both. */
export const load: LayoutLoad = async (event) => {
	const { user } = await event.parent();
	const conferenceId = event.params.conferenceId;
	const forUser = { conferenceId: { eq: conferenceId }, userId: { eq: user.sub } };

	const [teamMembers, supervisors] = await Promise.all([
		client.query.teamMembers({
			__args: {
				where: {
					...forUser,
					role: { in: ['REVIEWER', 'PROJECT_MANAGEMENT', 'PARTICIPANT_CARE'] }
				}
			},
			id: true,
			role: true
		}),
		client.query.conferenceSupervisors({
			__args: { where: forUser },
			id: true,
			supervisedDelegationMembers: { delegation: { id: true } }
		})
	]);

	const supervisor = supervisors.at(0) ?? null;

	return {
		conferenceId,
		teamMembers,
		supervisor,
		supervisedDelegationIds: [
			...new Set(supervisor?.supervisedDelegationMembers.map((m) => m.delegation.id) ?? [])
		]
	};
};
