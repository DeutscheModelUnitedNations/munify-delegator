import { graphql } from '$houdini';
import type { PostalRegistrationPageQueryVariables } from './$houdini';

export const _houdini_load = graphql(`
	query PostalRegistrationPageQuery($conferenceId: String!) {
		findUniqueConference(where: { id: $conferenceId }) {
			id
			startConference
			nextDocumentNumber
		}
	}
`);

export const _PostalRegistrationPageQueryVariables: PostalRegistrationPageQueryVariables = async (
	event
) => {
	return {
		conferenceId: event.params.conferenceId
	};
};
