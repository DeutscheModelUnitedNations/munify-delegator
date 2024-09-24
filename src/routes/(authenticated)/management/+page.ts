import { checkForError } from '$api/client';
import type { PageLoad } from './$types';
import { apiClient } from '$api/client';

export const load: PageLoad = async ({ params, fetch, url, parent }) => {
	const { mySystemRoles, teamMemberships } = await parent();

	const conferences = (
		await checkForError(apiClient({ fetch, origin: url.origin }).conference.get())
	).filter(
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
};
