import { client } from '$lib/api/rumbleClient/client';
import type { PageLoad } from './$types';

export const load: PageLoad = async (event) => {
	return {
		singleParticipants: await client.query.singleParticipants({
			__args: { where: { conferenceId: { eq: event.params.conferenceId } } },
			id: true,
			applied: true,
			school: true,
			appliedForRoles: { id: true, fontAwesomeIcon: true, name: true },
			assignedRole: { id: true, fontAwesomeIcon: true, name: true },
			motivation: true,
			experience: true,
			user: { id: true, familyName: true, givenName: true }
		})
	};
};
