import { client } from '$lib/api/rumbleClient/client';

/**
 * The conference picker. Someone taking part in exactly one conference is sent straight to it,
 * so this list only ever renders for people involved in several.
 */

/**
 * Every conference the caller takes part in, with their registrations folded in.
 *
 * The picker only ever renders for people involved in several; one is redirected straight to it.
 */
export async function fetchMyConferences(userId: string) {
	const forUser = { where: { userId: { eq: userId } } };

	const [conferences, delegationMembers, singleParticipants, supervisors, teamMembers] =
		await Promise.all([
			client.liveQuery.conferences({
				__args: {
					where: {
						OR: [
							{ conferenceSupervisors: { userId: { eq: userId } } },
							{ delegationMembers: { userId: { eq: userId } } },
							{ singleParticipants: { userId: { eq: userId } } },
							{ teamMembers: { userId: { eq: userId } } }
						]
					},
					orderBy: { startConference: 'desc' }
				},
				id: true,
				title: true,
				location: true,
				website: true,
				longTitle: true,
				language: true,
				imageDataURL: true,
				state: true,
				startAssignment: true,
				startConference: true,
				endConference: true
			}),
			client.liveQuery.delegationMembers({
				__args: forUser,
				id: true,
				isHeadDelegate: true,
				conference: { id: true },
				assignedCommittee: { id: true, abbreviation: true, name: true },
				delegation: {
					id: true,
					applied: true,
					assignedNation: { alpha2Code: true, alpha3Code: true },
					assignedNonStateActor: { id: true, name: true, fontAwesomeIcon: true }
				}
			}),
			client.liveQuery.singleParticipants({
				__args: forUser,
				id: true,
				conference: { id: true },
				applied: true,
				assignedRole: { id: true, name: true, fontAwesomeIcon: true }
			}),
			client.liveQuery.conferenceSupervisors({
				__args: forUser,
				id: true,
				conference: { id: true },
				supervisedDelegationMembers: {
					id: true,
					delegation: {
						assignedNation: { alpha2Code: true },
						assignedNonStateActor: { id: true }
					}
				},
				supervisedSingleParticipants: { id: true, assignedRole: { id: true } }
			}),
			client.liveQuery.teamMembers({
				__args: forUser,
				id: true,
				conference: { id: true },
				role: true
			})
		]);

	return {
		conferences: conferences.map((conference) => ({
			...conference,
			delegationMembers: delegationMembers.filter((row) => row.conference.id === conference.id),
			singleParticipants: singleParticipants.filter((row) => row.conference.id === conference.id),
			conferenceSupervisors: supervisors.filter((row) => row.conference.id === conference.id),
			teamMembers: teamMembers.filter((row) => row.conference.id === conference.id)
		}))
	};
}
