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
		findManyTeamMemberInvitations(
			where: {
				conferenceId: { equals: $conferenceId }
				usedAt: { equals: null }
				revokedAt: { equals: null }
			}
		) {
			id
			email
			role
			expiresAt
			userExists
			invitedBy {
				given_name
				family_name
			}
		}
	}
`);

export const _TeamMembersQueryVariables = (event) => {
	return {
		conferenceId: event.params.conferenceId
	};
};
