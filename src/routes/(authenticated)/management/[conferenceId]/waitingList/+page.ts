import { graphql } from '$houdini';

export const _houdini_load = graphql(`
	query WaitingListManagementQuery($conferenceId: String!) {
		findManyWaitingListEntry(
			where: { conferenceId: { equals: $conferenceId }, assigned: { equals: false } }
		) {
			id
			user {
				id
				given_name
				family_name
				email
				city
				birthday
				conferenceParticipationsCount
			}
			school
			experience
			motivation
			requests
			hidden
			assigned
			createdAt
		}
	}
`);

export const _WaitingListManagementQueryVariables = async (event) => {
	const { conferenceId } = event.params;
	return { conferenceId };
};
