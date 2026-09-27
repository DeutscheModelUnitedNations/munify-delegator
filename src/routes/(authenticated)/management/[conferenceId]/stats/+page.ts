import type { PageLoad } from './$types';
import { fetchConferenceStatistics } from './statsQuery';

export const ssr = false;

export const load: PageLoad = async (event) => {
	const conferenceId = event.params.conferenceId;

	return {
		stats: await fetchConferenceStatistics(conferenceId, 'ALL'),
		conferenceId
	};
};
