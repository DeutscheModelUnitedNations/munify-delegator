import { client } from '$lib/api/rumbleClient/client';
import { fetchCurrentUser } from '$lib/api/currentUser';
import type { TeamroleEnum } from '$lib/api/rumbleClient/client';

/** Roles that open the management pages; the content lead only reaches the seat planning there. */
const MANAGEMENT_ROLES: readonly TeamroleEnum[] = [
	'PROJECT_MANAGEMENT',
	'PARTICIPANT_CARE',
	'CONTENT_LEAD'
];

/** The caller's team roles in the conference, as the team member rows hold them. */
async function rolesOf(conferenceId: string, userId: string): Promise<TeamroleEnum[]> {
	const teamMembers = await client.query.teamMembers({
		__args: { where: { conferenceId: { eq: conferenceId }, userId: { eq: userId } } },
		role: true
	});
	return teamMembers.map((member) => member.role);
}

/**
 * What the caller is in the management pages of one conference: `SYSTEM_ADMIN` for system admins,
 * with or without a part in the conference, otherwise their team role there if it opens the
 * management pages, or `undefined`. `$lib/helpers/managementAccess` decides what each may see.
 *
 * A plain query, not a `liveQuery`: it is what the guards ask, so it has to be right rather than
 * reactive.
 */
export async function managementMembership(
	conferenceId: string
): Promise<TeamroleEnum | 'SYSTEM_ADMIN' | undefined> {
	const user = await fetchCurrentUser();
	if (user.isAdmin) return 'SYSTEM_ADMIN';

	const roles = await rolesOf(conferenceId, user.sub);
	return roles.find((role) => MANAGEMENT_ROLES.includes(role));
}

/** Whether the caller holds any team role in the conference, whatever it is. */
export async function isTeamMemberOf(conferenceId: string): Promise<boolean> {
	const user = await fetchCurrentUser();
	if (user.isAdmin) return true;

	return (await rolesOf(conferenceId, user.sub)).length > 0;
}

/** Every team role the caller holds in the conference; empty for system admins without a part. */
export async function myTeamRoles(conferenceId: string): Promise<TeamroleEnum[]> {
	const user = await fetchCurrentUser();
	return rolesOf(conferenceId, user.sub);
}
