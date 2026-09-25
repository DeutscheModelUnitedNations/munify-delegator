import { client } from '$lib/api/rumbleClient/client';
import type { PageLoad } from './$types';

export const load: PageLoad = async (event) => {
	return {
		roles: await client.query.customConferenceRoles({
			__args: { where: { conferenceId: { eq: event.params.conferenceId } } },
			id: true,
			name: true,
			description: true,
			fontAwesomeIcon: true
		})
	};
};
