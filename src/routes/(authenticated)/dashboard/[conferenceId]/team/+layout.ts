import { error } from '@sveltejs/kit';
import type { LayoutLoad } from './$types';
import { m } from '#lib/paraglide/messages.js';
import { fetchTeamAccess } from '#lib/api/teamAccess.js';
import { isOnTeam } from '#lib/helpers/teamAccess.js';
import { mayOpenTeamRoute, teamRouteForPath } from '#lib/data/teamRoutes.js';

/**
 * The one guard of the team area. Holding a privileged role in another conference grants nothing
 * here. A page's entry in the route registry says who may open it; a path without an entry (the
 * overview, say) needs any team role. Nobody is redirected: what you may not open is a 403.
 */
export const load: LayoutLoad = async (event) => {
	const { conferenceId } = event.params;
	const access = await fetchTeamAccess(conferenceId);
	if (!isOnTeam(access)) error(403, m.noAccess());

	const relativePath = event.url.pathname.replace(`/dashboard/${conferenceId}/`, '');
	const route = teamRouteForPath(relativePath);
	if (route && !mayOpenTeamRoute(route, access)) error(403, m.noAccess());
};
