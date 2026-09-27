import { client } from '$lib/api/rumbleClient/client';

/** Everything the assignment assistant needs to open a project for a conference. */
export async function fetchAssignmentProject(conferenceId: string) {
	const applied = { where: { conferenceId: { eq: conferenceId }, applied: { eq: true } } };

	const [delegations, singleParticipants, conference] = await Promise.all([
		client.query.delegations({
			__args: applied,
			id: true,
			school: true,
			appliedForRoles: {
				id: true,
				rank: true,
				nation: { alpha3Code: true, alpha2Code: true },
				nonStateActor: {
					id: true,
					name: true,
					abbreviation: true,
					fontAwesomeIcon: true,
					seatAmount: true
				}
			},
			members: {
				id: true,
				isHeadDelegate: true,
				user: { id: true },
				supervisors: { id: true, user: { id: true } }
			}
		}),
		client.query.singleParticipants({
			__args: applied,
			id: true,
			school: true,
			supervisors: { id: true, user: { id: true } },
			user: { id: true },
			appliedForRoles: { id: true, fontAwesomeIcon: true, name: true }
		}),
		client.query.conference({
			__args: { id: conferenceId },
			id: true,
			title: true,
			startConference: true,
			nonStateActors: {
				id: true,
				name: true,
				fontAwesomeIcon: true,
				abbreviation: true,
				seatAmount: true
			},
			committees: {
				id: true,
				name: true,
				abbreviation: true,
				numOfSeatsPerDelegation: true,
				nations: { alpha2Code: true, alpha3Code: true }
			},
			individualApplicationOptions: { id: true, name: true, fontAwesomeIcon: true }
		})
	]);

	return { delegations, singleParticipants, conference };
}

export type AssignmentProject = Awaited<ReturnType<typeof fetchAssignmentProject>>;
