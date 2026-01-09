import { graphql } from '$houdini';

export const _houdini_load = graphql(`
	query TeamMembersQuery($conferenceId: String!) {
		findManyTeamMembers(where: { conferenceId: { equals: $conferenceId } }) {
			id
			role
			user {
				id
				given_name
				family_name
				email
			}
		}
	}
`);

export const _TeamMembersQueryVariables = (event) => {
	return {
		conferenceId: event.params.conferenceId
	};
};
