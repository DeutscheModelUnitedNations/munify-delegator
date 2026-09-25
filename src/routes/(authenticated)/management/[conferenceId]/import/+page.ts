import { client } from '$lib/api/rumbleClient/client';
import type { PageLoad } from './$types';

export const load: PageLoad = async (event) => {
	return {
		committees: await client.query.committees({
			__args: { where: { conferenceId: { eq: event.params.conferenceId } } },
			id: true,
			abbreviation: true,
			name: true
		})
	};
};
