import { graphql } from '$houdini';

export const _houdini_load = graphql(`
	query BaseAssignmentDataQuery($conferenceId: String!) {
		findManyDelegations(
			where: { conferenceId: { equals: $conferenceId }, applied: { equals: true } }
		) {
			id
			appliedForRoles {
				id
				rank
				nation {
					alpha3Code
					alpha2Code
				}
				nonStateActor {
					id
					name
					abbreviation
					fontAwesomeIcon
					seatAmount
				}
			}
			members {
				id
				isHeadDelegate
				user {
					id
				}
				supervisors {
					id
					user {
						id
					}
				}
			}
		}

		findManySingleParticipants(
			where: { conferenceId: { equals: $conferenceId }, applied: { equals: true } }
		) {
			id
			supervisors {
				id
				user {
					id
				}
			}
			user {
				id
			}
			appliedForRoles {
				id
				fontAwesomeIcon
				name
			}
		}

		findUniqueConference(where: { id: $conferenceId }) {
			id
			title
			startConference
			nonStateActors {
				id
				name
				fontAwesomeIcon
				abbreviation
				seatAmount
			}
			committees {
				id
				name
				abbreviation
				numOfSeatsPerDelegation
				nations {
					alpha2Code
					alpha3Code
				}
			}
			individualApplicationOptions {
				id
				name
				fontAwesomeIcon
			}
		}
	}
`);

export const _BaseAssignmentDataQueryVariables = async (event) => {
	const { conferenceId } = event.params;
	return { conferenceId };
};
