import { client } from '$lib/api/rumbleClient/client';
import type { PageLoad } from './$types';

const seatHolder = { id: true, givenName: true, familyName: true } as const;

export const load: PageLoad = async (event) => {
	const conferenceId = event.params.conferenceId;
	const inConference = { where: { conferenceId: { eq: conferenceId } } };

	const [committees, nations, roles, delegations, nonStateActors, singleParticipants, supervisors] =
		await Promise.all([
			client.query.committees({
				__args: inConference,
				id: true,
				name: true,
				abbreviation: true,
				numOfSeatsPerDelegation: true
			}),
			client.query.nations({
				__args: { where: { committees: { conferenceId: { eq: conferenceId } } } },
				alpha2Code: true,
				alpha3Code: true,
				committees: { id: true, numOfSeatsPerDelegation: true }
			}),
			client.query.customConferenceRoles({
				__args: inConference,
				id: true,
				name: true,
				description: true,
				fontAwesomeIcon: true,
				seatAmount: true
			}),
			client.query.delegations({
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
			client.query.nonStateActors({
				__args: inConference,
				id: true,
				name: true,
				abbreviation: true,
				fontAwesomeIcon: true,
				seatAmount: true
			}),
			client.query.singleParticipants({
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
			client.query.conferenceSupervisors({ __args: inConference, id: true, user: seatHolder })
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
};
