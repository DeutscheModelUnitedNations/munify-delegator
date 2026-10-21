import { client } from '#lib/api/rumbleClient/client.js';
import { fetchCurrentUser } from '#lib/api/currentUser.js';
import type { TeamAccess } from '#lib/helpers/teamAccess.js';

/**
 * What the caller is in one conference's team: all the roles they hold there, and whether they
 * are a system admin (who passes every check, on the team or not).
 *
 * A plain query, not a `liveQuery`: it is what the route guard asks, so it has to be right rather
 * than reactive. `#lib/helpers/teamAccess` and `$lib/data/teamRoutes` decide what each may open.
 */
export async function fetchTeamAccess(conferenceId: string): Promise<TeamAccess> {
	const user = await fetchCurrentUser();
	const teamMembers = await client.query.teamMembers({
		__args: { where: { conferenceId: { eq: conferenceId }, userId: { eq: user.sub } } },
		role: true
	});
	return { isAdmin: user.isAdmin, roles: teamMembers.map((member) => member.role) };
}
