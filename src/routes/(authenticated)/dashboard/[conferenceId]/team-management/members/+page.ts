import { graphql } from '$houdini';

export const _houdini_load = graphql(`
	query TeamManagementMembersQuery($conferenceId: String!) {
		findManyTeamMembers(where: { conferenceId: { equals: $conferenceId } }) {
			id
			role
			user {
				id
				given_name
				family_name
				email
				birthday
				phone
				street
				zip
				city
				country
				gender
				foodPreference
			}
		}
	}
`);

export const _TeamManagementMembersQueryVariables = (event: {
	params: { conferenceId: string };
}) => {
	return {
		conferenceId: event.params.conferenceId
	};
};
