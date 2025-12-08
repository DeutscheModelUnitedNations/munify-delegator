import { graphql } from '$houdini';

export const _houdini_load = graphql(`
	query PaymentGroupQuery($conferenceId: String!) {
		findManyConferenceSupervisors(where: { conferenceId: { equals: $conferenceId } }) {
			id
			user {
				id
				given_name
				family_name
			}
			supervisedDelegationMembers {
				id
			}
			supervisedSingleParticipants {
				id
			}
		}
	}
`);

export const _PaymentGroupQueryVariables = async (event) => {
	const { conferenceId } = event.params;
	return { conferenceId };
};
