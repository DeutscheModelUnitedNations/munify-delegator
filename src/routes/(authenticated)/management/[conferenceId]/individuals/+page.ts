import { graphql } from '$houdini';

export const _houdini_load = graphql(`
	query ConferenceSingleParticipantsQuery($conferenceId: String!) {
		findManySingleParticipants(where: { conferenceId: { equals: $conferenceId } }) {
			id
			applied
			school
			appliedForRoles {
				id
				fontAwesomeIcon
				name
			}
			assignedRole {
				id
				fontAwesomeIcon
				name
			}
			motivation
			experience
			user {
				id
				family_name
				given_name
			}
		}
	}
`);

export const _ConferenceSingleParticipantsQueryVariables = async (event) => {
	const { conferenceId } = event.params;
	return { conferenceId };
};
