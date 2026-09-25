import { client } from '$lib/api/rumbleClient/client';
import type { PageLoad } from './$types';

export const load: PageLoad = async (event) => {
	const { user } = await event.parent();
	const conferenceId = event.params.conferenceId;

	const [delegationMembers, committees] = await Promise.all([
		client.query.delegationMembers({
			__args: {
				where: { conferenceId: { eq: conferenceId }, userId: { eq: user.sub } }
			},
			id: true,
			isHeadDelegate: true,
			assignedCommittee: { id: true },
			delegation: {
				id: true,
				assignedNation: { alpha3Code: true, alpha2Code: true },
				members: {
					id: true,
					user: { id: true, familyName: true, givenName: true },
					assignedCommittee: { id: true }
				}
			}
		}),
		client.query.committees({
			__args: { where: { conferenceId: { eq: conferenceId } } },
			id: true,
			abbreviation: true,
			name: true,
			nations: { alpha3Code: true, alpha2Code: true },
			numOfSeatsPerDelegation: true
		})
	]);

	return { delegationMember: delegationMembers.at(0) ?? null, committees };
};
