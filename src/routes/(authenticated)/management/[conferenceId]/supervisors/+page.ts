import { graphql } from '$houdini';

export const _houdini_load = graphql(`
	query ConferenceSupervisorsQuery($conferenceId: String!) {
		findManyConferenceSupervisors(where: { conferenceId: { equals: $conferenceId } }) {
			id
			plansOwnAttendenceAtConference
			user {
				family_name
				given_name
			}
			supervisedDelegationMembers {
				delegation {
					id
				}
			}
			supervisedSingleParticipants {
				id
			}
		}
	}
`);

export const _ConferenceSupervisorsQueryVariables = async (event) => {
	const { conferenceId } = event.params;
	return { conferenceId };
};
