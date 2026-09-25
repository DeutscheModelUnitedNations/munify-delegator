import { client } from '$lib/api/rumbleClient/client';
import { error } from '@sveltejs/kit';
import { m } from '$lib/paraglide/messages';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const conference = await client.query.conference({
		__args: { id: event.params.conferenceId },
		info: true,
		showInfoExpanded: true
	});

	if (!conference) {
		throw error(404, m.notFound());
	}

	return {
		info: conference.info ?? '',
		showInfoExpanded: conference.showInfoExpanded,
		conferenceId: event.params.conferenceId
	};
};
