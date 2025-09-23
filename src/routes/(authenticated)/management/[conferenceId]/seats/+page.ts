import { graphql } from '$houdini';

export const _houdini_load = graphql(`
	query SeatsQuery($conferenceId: String!) {
		findManyCommittees(where: { conferenceId: { equals: $conferenceId } }) {
			id
			name
			abbreviation
			numOfSeatsPerDelegation
		}
		findManyNations(where: { committees: { some: { conferenceId: { equals: $conferenceId } } } }) {
			alpha2Code
			alpha3Code
			committees {
				id
				numOfSeatsPerDelegation
			}
		}
		findManyCustomConferenceRoles(where: { conferenceId: { equals: $conferenceId } }) {
			id
			name
			description
			fontAwesomeIcon
		}
		findManyDelegations(where: { conferenceId: { equals: $conferenceId } }) {
			id
			assignedNation {
				alpha2Code
				alpha3Code
			}
			members {
				id
				assignedCommittee {
					id
				}
				user {
					id
					given_name
					family_name
				}
				isHeadDelegate
			}
			assignedNation {
				alpha2Code
				alpha3Code
			}
			assignedNonStateActor {
				id
				name
			}
		}
		findManyNonStateActors(where: { conferenceId: { equals: $conferenceId } }) {
			id
			name
			abbreviation
			fontAwesomeIcon
			seatAmount
		}
		findManySingleParticipants(where: { conferenceId: { equals: $conferenceId } }) {
			id
			user {
				id
				given_name
				family_name
			}
			assignedRole {
				id
				name
				description
				fontAwesomeIcon
			}
		}
		findManyConferenceSupervisors(
			where: { conferenceId: { equals: $conferenceId } }
			orderBy: [{ user: { family_name: asc } }]
		) {
			id
			user {
				id
				given_name
				family_name
			}
		}
	}
`);

export const _SeatsQueryVariables = async (event) => {
	const { conferenceId } = event.params;
	return { conferenceId };
};
