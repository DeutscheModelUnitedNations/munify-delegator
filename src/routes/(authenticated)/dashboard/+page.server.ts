import { redirect } from '@sveltejs/kit';
import { graphql } from '$houdini';
import type { PageServerLoad } from './$types';

const myConferencesDashboardQuery = graphql(`
	query MyConferencesDashboardServerQuery($userId: String!) {
		findManyConferences(
			where: {
				OR: [
					{ conferenceSupervisors: { some: { userId: { equals: $userId } } } }
					{ delegationMembers: { some: { userId: { equals: $userId } } } }
					{ singleParticipants: { some: { userId: { equals: $userId } } } }
					{ teamMembers: { some: { userId: { equals: $userId } } } }
				]
			}
			orderBy: [{ startConference: desc }]
		) {
			id
			title
			location
			website
			longTitle
			language
			imageDataURL
			state
			startAssignment
			startConference
			endConference
		}
		findManyDelegationMembers(where: { userId: { equals: $userId } }) {
			id
			isHeadDelegate
			conference {
				id
			}
			assignedCommittee {
				id
				abbreviation
				name
			}
			delegation {
				id
				applied
				assignedNation {
					alpha2Code
					alpha3Code
				}
				assignedNonStateActor {
					id
					name
					fontAwesomeIcon
				}
			}
		}
		findManySingleParticipants(where: { userId: { equals: $userId } }) {
			id
			conference {
				id
			}
			applied
			assignedRole {
				id
				name
				fontAwesomeIcon
			}
		}
		findManyConferenceSupervisors(where: { userId: { equals: $userId } }) {
			id
			conference {
				id
			}
			supervisedDelegationMembers {
				id
				delegation {
					assignedNation {
						alpha2Code
					}
					assignedNonStateActor {
						id
					}
				}
			}
			supervisedSingleParticipants {
				id
				assignedRole {
					id
				}
			}
		}
		findManyTeamMembers(where: { userId: { equals: $userId } }) {
			id
			conference {
				id
			}
			role
		}
	}
`);

export const load: PageServerLoad = async (event) => {
	const { user } = await event.parent();

	const { data } = await myConferencesDashboardQuery.fetch({
		event,
		variables: { userId: user.sub },
		blocking: true
	});

	const conferences = data?.findManyConferences ?? [];
	const delegationMembers = data?.findManyDelegationMembers ?? [];
	const singleParticipants = data?.findManySingleParticipants ?? [];
	const supervisors = data?.findManyConferenceSupervisors ?? [];
	const teamMembers = data?.findManyTeamMembers ?? [];

	if (conferences.length === 1) {
		redirect(303, `/dashboard/${conferences[0].id}`);
	}

	// Combine conference data with participation data
	const conferencesWithParticipation = conferences.map((conference) => ({
		...conference,
		delegationMembers: delegationMembers.filter((dm) => dm.conference.id === conference.id),
		singleParticipants: singleParticipants.filter((sp) => sp.conference.id === conference.id),
		conferenceSupervisors: supervisors.filter((s) => s.conference.id === conference.id),
		teamMembers: teamMembers.filter((tm) => tm.conference.id === conference.id)
	}));

	return {
		conferences: conferencesWithParticipation
	};
};
