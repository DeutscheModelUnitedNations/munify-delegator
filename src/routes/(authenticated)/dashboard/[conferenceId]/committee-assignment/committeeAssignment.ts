import { client } from '$lib/api/rumbleClient/client';

/** The caller's delegation membership plus the committees they could be assigned to. */
export async function fetchCommitteeAssignment(conferenceId: string, userId: string) {
	const [delegationMembers, committees] = await Promise.all([
		client.liveQuery.delegationMembers({
			__args: {
				where: { conference: { id: { eq: conferenceId } }, user: { id: { eq: userId } } }
			},
			id: true,
			isHeadDelegate: true,
			assignedCommittee: { id: true },
			delegation: {
				id: true,
				assignedRole: { id: true },
				members: {
					id: true,
					user: { id: true, familyName: true, givenName: true },
					assignedCommittee: { id: true }
				}
			}
		}),
		client.liveQuery.committees({
			__args: { where: { conferenceId: { eq: conferenceId } } },
			id: true,
			abbreviation: true,
			name: true,
			roles: { id: true },
			numOfSeatsPerDelegation: true
		})
	]);

	// A getter, not `delegationMembers.at(0)` taken once: reading through the live list is what
	// lets the page see the assignments it just saved.
	return {
		get delegationMember() {
			return delegationMembers.at(0) ?? null;
		},
		committees
	};
}
