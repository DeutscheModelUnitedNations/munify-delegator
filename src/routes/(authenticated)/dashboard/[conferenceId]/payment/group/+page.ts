import { client } from '$lib/api/rumbleClient/client';
import type { PageLoad } from './$types';

/** Every supervisor of the conference, so a group payment can name the ones it covers. */
export const load: PageLoad = async (event) => {
	return {
		conferenceSupervisors: await client.query.conferenceSupervisors({
			__args: { where: { conferenceId: { eq: event.params.conferenceId } } },
			id: true,
			user: { id: true, givenName: true, familyName: true },
			supervisedDelegationMembers: { id: true },
			supervisedSingleParticipants: { id: true }
		})
	};
};
