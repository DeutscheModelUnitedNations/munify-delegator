import { graphql } from '$houdini';

export const _houdini_load = graphql(`
	query ConferenceDelegationsQuery($conferenceId: String!) {
		findManyDelegations(where: { conferenceId: { equals: $conferenceId } }) {
			id
			entryCode
			applied
			school
			assignedNation {
				alpha3Code
			}
			assignedNonStateActor {
				name
			}
			members {
				id
				user {
					id
					given_name
					family_name
				}
				isHeadDelegate
				supervisors {
					id
					plansOwnAttendenceAtConference
					user {
						id
						given_name
						family_name
					}
				}
			}
			appliedForRoles {
				id
			}
			motivation
			experience
			assignedNation {
				alpha2Code
				alpha3Code
			}
			assignedNonStateActor {
				id
				abbreviation
				name
				description
				fontAwesomeIcon
			}
		}
	}
`);

export const _ConferenceDelegationsQueryVariables = async (event) => {
	const { conferenceId } = event.params;
	return { conferenceId };
};
