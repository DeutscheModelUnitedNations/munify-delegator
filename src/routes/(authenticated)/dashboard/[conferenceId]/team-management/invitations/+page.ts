import { graphql } from '$houdini';

export const _houdini_load = graphql(`
	query TeamManagementInvitationsQuery($conferenceId: String!) {
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

export const _TeamManagementInvitationsQueryVariables = (event: {
	params: { conferenceId: string };
}) => {
	return {
		conferenceId: event.params.conferenceId
	};
};
