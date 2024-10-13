import { checkForError } from '$api/client';
import type { PageLoad } from './$types';
import { apiClient } from '$api/client';
import { loadApiHandler } from '$lib/helper/loadApiHandler';

export const load: PageLoad = loadApiHandler(async ({ params, fetch, url, parent }) => {
	const { mySystemRoles, teamMemberships } = await parent();

	const conferences = (await checkForError(api.conference.get())).filter(
		(conference) =>
			mySystemRoles.includes('admin') ||
			teamMemberships.some(
				(team) =>
					team.conferenceId === conference.id &&
					(team.role === 'PROJECT_MANAGEMENT' || team.role === 'PARTICIPANT_CARE')
			)
	);

	return {
		conferences
	};
});
