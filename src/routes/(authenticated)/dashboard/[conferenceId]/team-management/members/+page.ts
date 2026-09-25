import { client } from '$lib/api/rumbleClient/client';
import type { PageLoad } from './$types';

export const load: PageLoad = async (event) => {
	return {
		teamMembers: await client.query.teamMembers({
			__args: { where: { conferenceId: { eq: event.params.conferenceId } } },
			id: true,
			role: true,
			user: {
				id: true,
				givenName: true,
				familyName: true,
				email: true,
				birthday: true,
				phone: true,
				street: true,
				zip: true,
				city: true,
				country: true,
				gender: true,
				foodPreference: true
			}
		})
	};
};
