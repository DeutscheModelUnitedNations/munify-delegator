import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import { m } from '#lib/paraglide/messages.js';
import { client } from '#lib/api/rumbleClient/client.js';
import { fetchTeamAccess } from '#lib/api/teamAccess.js';
import { isOnTeam } from '#lib/helpers/teamAccess.js';

/**
 * The schedule is shown to everybody once the conference has switched it on, and to the team
 * whatever the switch says (they are the ones building it).
 */
export const load: PageLoad = async ({ params }) => {
	const conference = await client.query.conference({
		__args: { id: params.conferenceId },
		showCalendar: true
	});
	if (conference.showCalendar) return;
	if (!isOnTeam(await fetchTeamAccess(params.conferenceId))) error(403, m.noAccess());
};
