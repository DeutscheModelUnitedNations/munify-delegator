import { client } from '$lib/api/rumbleClient/client';
import { fetchCurrentUser } from '$lib/api/currentUser';

const PRIVILEGED_ROLES = ['PROJECT_MANAGEMENT', 'PARTICIPANT_CARE'] as const;

/**
 * Whether the caller may use the management pages of one conference: system admins always, with
 * or without a part in the conference, everyone else only with a privileged team role there.
 *
 * A plain query, not a `liveQuery`: it is what the guards ask, so it has to be right rather than
 * reactive.
 */
export async function canManageConference(conferenceId: string) {
	const user = await fetchCurrentUser();
	if (user.isAdmin) return true;

	const teamMembers = await client.query.teamMembers({
		__args: { where: { conferenceId: { eq: conferenceId }, userId: { eq: user.sub } } },
		role: true
	});

	return teamMembers.some((member) => PRIVILEGED_ROLES.some((role) => role === member.role));
}
