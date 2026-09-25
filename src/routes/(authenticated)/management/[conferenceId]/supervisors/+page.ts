import { client } from '$lib/api/rumbleClient/client';
import type { PageLoad } from './$types';

export const load: PageLoad = async (event) => {
	return {
		supervisors: await client.query.conferenceSupervisors({
			__args: { where: { conferenceId: { eq: event.params.conferenceId } } },
			id: true,
			plansOwnAttendenceAtConference: true,
			user: { id: true, familyName: true, givenName: true },
			supervisedDelegationMembers: { delegation: { id: true } },
			supervisedSingleParticipants: { id: true }
		})
	};
};
