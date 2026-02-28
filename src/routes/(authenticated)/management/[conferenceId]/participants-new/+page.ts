import { graphql } from '$houdini';

export const _houdini_load = graphql(`
	query AllConferenceParticipantsQuery($conferenceId: String!) {
		findManyDelegationMembers(where: { conferenceId: { equals: $conferenceId } }) {
			user {
				id
				given_name
				family_name
				email
			}
		}
		findManyConferenceSupervisors(where: { conferenceId: { equals: $conferenceId } }) {
			user {
				id
				given_name
				family_name
				email
			}
		}
		findManySingleParticipants(where: { conferenceId: { equals: $conferenceId } }) {
			user {
				id
				given_name
				family_name
				email
			}
		}
		findManyTeamMembers(where: { conferenceId: { equals: $conferenceId } }) {
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

export const _AllConferenceParticipantsQueryVariables = (event: {
	params: { conferenceId: string };
}) => {
	return { conferenceId: event.params.conferenceId };
};
