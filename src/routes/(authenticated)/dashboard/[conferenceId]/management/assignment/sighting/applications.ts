import { client } from '$lib/api/rumbleClient/client';

const person = {
	id: true,
	givenName: true,
	familyName: true,
	email: true,
	birthday: true,
	gender: true,
	conferenceParticipationsCount: true,
	globalNotes: true
} as const;

const supervisors = {
	id: true,
	user: { id: true, givenName: true, familyName: true, email: true }
} as const;

/**
 * Every application of the conference with what the sighting shows of it, in one go: the cards
 * are then turned from memory instead of fetching each one. The reviews are not part of it, so
 * rating something does not load all of this again.
 */
export async function fetchSightingApplications(conferenceId: string) {
	const inConference = { conferenceId: { eq: conferenceId }, applied: { eq: true } };
	const [delegations, singleParticipants, conference] = await Promise.all([
		client.liveQuery.delegations({
			__args: { where: inConference },
			id: true,
			school: true,
			motivation: true,
			experience: true,
			members: {
				id: true,
				isHeadDelegate: true,
				user: person,
				supervisors
			},
			appliedForRoles: {
				id: true,
				rank: true,
				nation: { alpha3Code: true, alpha2Code: true },
				nonStateActor: { id: true, name: true, fontAwesomeIcon: true }
			}
		}),
		client.liveQuery.singleParticipants({
			__args: { where: inConference },
			id: true,
			school: true,
			motivation: true,
			experience: true,
			user: person,
			supervisors,
			appliedForRoles: { id: true, name: true }
		}),
		client.liveQuery.conference({
			__args: { id: conferenceId },
			startConference: true
		})
	]);
	return { delegations, singleParticipants, startConference: conference.startConference };
}
