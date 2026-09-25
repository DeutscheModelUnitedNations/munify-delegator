import { client } from '$lib/api/rumbleClient/client';
import type { PageLoad } from './$types';

export const load: PageLoad = async (event) => {
	return {
		conference: await client.query.conference({
			__args: { id: event.params.conferenceId },
			id: true,
			committees: { id: true, name: true, abbreviation: true }
		})
	};
};
