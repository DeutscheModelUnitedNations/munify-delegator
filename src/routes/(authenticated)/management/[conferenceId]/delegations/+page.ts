import { client } from '$lib/api/rumbleClient/client';
import type { PageLoad } from './$types';

export const load: PageLoad = async (event) => {
	return {
		delegations: await client.query.delegations({
			__args: { where: { conferenceId: { eq: event.params.conferenceId } } },
			id: true,
			entryCode: true,
			applied: true,
			school: true,
			motivation: true,
			experience: true,
			assignedNation: { alpha2Code: true, alpha3Code: true },
			assignedNonStateActor: {
				id: true,
				abbreviation: true,
				name: true,
				description: true,
				fontAwesomeIcon: true
			},
			members: {
				id: true,
				isHeadDelegate: true,
				user: { id: true, givenName: true, familyName: true },
				supervisors: {
					id: true,
					plansOwnAttendenceAtConference: true,
					user: { id: true, givenName: true, familyName: true }
				}
			},
			appliedForRoles: { id: true }
		})
	};
};
