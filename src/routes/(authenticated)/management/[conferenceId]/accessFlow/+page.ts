import { graphql } from '$houdini';
import type { AccessFlowPageQueryVariables } from './$houdini';

export const _houdini_load = graphql(`
	query AccessFlowPageQuery($conferenceId: String!) {
		findUniqueConference(where: { id: $conferenceId }) {
			id
			title
		}
	}
`);

export const _AccessFlowPageQueryVariables: AccessFlowPageQueryVariables = async (event) => {
	return {
		conferenceId: event.params.conferenceId
	};
};
