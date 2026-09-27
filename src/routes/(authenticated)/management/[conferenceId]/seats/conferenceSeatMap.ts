import { client } from '$lib/api/rumbleClient/client';

const seatHolder = { id: true, givenName: true, familyName: true } as const;

/** Who holds which seat: the committees and roles on offer, and who has been given them. */
export async function fetchConferenceSeatMap(conferenceId: string) {
	const inConference = { where: { conferenceId: { eq: conferenceId } } };

	const [committees, nations, roles, delegations, nonStateActors, singleParticipants, supervisors] =
		await Promise.all([
			client.liveQuery.committees({
				__args: inConference,
				id: true,
				name: true,
				abbreviation: true,
				numOfSeatsPerDelegation: true
			}),
			client.liveQuery.nations({
				__args: { where: { committees: { conferenceId: { eq: conferenceId } } } },
				alpha2Code: true,
				alpha3Code: true,
				committees: { id: true, numOfSeatsPerDelegation: true }
			}),
			client.liveQuery.customConferenceRoles({
				__args: inConference,
				id: true,
				name: true,
				description: true,
				fontAwesomeIcon: true,
				seatAmount: true
			}),
			client.liveQuery.delegations({
				__args: inConference,
				id: true,
				assignedNation: { alpha2Code: true, alpha3Code: true },
				assignedNonStateActor: { id: true, name: true },
				members: {
					id: true,
					isHeadDelegate: true,
					assignedCommittee: { id: true },
					user: seatHolder
				}
			}),
			client.liveQuery.nonStateActors({
				__args: inConference,
				id: true,
				name: true,
				abbreviation: true,
				fontAwesomeIcon: true,
				seatAmount: true
			}),
			client.liveQuery.singleParticipants({
				__args: inConference,
				id: true,
				user: seatHolder,
				assignedRole: {
					id: true,
					name: true,
					description: true,
					fontAwesomeIcon: true,
					seatAmount: true
				}
			}),
			client.liveQuery.conferenceSupervisors({ __args: inConference, id: true, user: seatHolder })
		]);

	return {
		committees,
		nations,
		roles,
		delegations,
		nonStateActors,
		singleParticipants,
		// The order argument cannot reach through to the user's name, so this sorts here.
		supervisors: [...supervisors].sort((a, b) =>
			(a.user.familyName ?? '').localeCompare(b.user.familyName ?? '')
		)
	};
}

export type ConferenceSeatMap = Awaited<ReturnType<typeof fetchConferenceSeatMap>>;
