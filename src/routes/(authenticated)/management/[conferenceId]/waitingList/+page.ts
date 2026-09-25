import { client } from '$lib/api/rumbleClient/client';
import type { PageLoad } from './$types';

/** Only entries still waiting - assigned ones have become real registrations. */
export const load: PageLoad = async (event) => {
	return {
		waitingListEntries: await client.query.waitingListEntries({
			__args: {
				where: { conferenceId: { eq: event.params.conferenceId }, assigned: { eq: false } }
			},
			id: true,
			user: {
				id: true,
				givenName: true,
				familyName: true,
				email: true,
				phone: true,
				city: true,
				birthday: true,
				conferenceParticipationsCount: true
			},
			school: true,
			experience: true,
			motivation: true,
			requests: true,
			hidden: true,
			assigned: true,
			createdAt: true
		})
	};
};
