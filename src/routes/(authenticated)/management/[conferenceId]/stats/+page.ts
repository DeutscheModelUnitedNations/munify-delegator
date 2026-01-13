import { error } from '@sveltejs/kit';
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

	if (!data) {
		throw error(404, 'Data not found');
	}
	return {
		stats: data.getConferenceStatistics,
		conferenceId
	};
};
