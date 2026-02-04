import type { PageLoad } from './$types';
import { statsQuery } from './statsQuery';

export const ssr = false;

export const load: PageLoad = async (event) => {
	const conferenceId = event.params.conferenceId;
	const { data } = await statsQuery.fetch({
		event,
		variables: { conferenceID: conferenceId, filter: 'ALL' },
		blocking: true
	});

	return {
		stats: data?.getConferenceStatistics ?? null,
		conferenceId
	};
};
