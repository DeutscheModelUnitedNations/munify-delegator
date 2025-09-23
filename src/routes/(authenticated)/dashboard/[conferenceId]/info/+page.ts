import { graphql } from '$houdini';

export const _houdini_load = graphql(`
	query ConferenceInfoQuery($conferenceId: String!) {
		findUniqueConference(where: { id: $conferenceId }) {
			id
			title
			info
		}
	}
`);

export const _ConferenceInfoQueryVariables = async (event) => {
	const { conferenceId } = event.params;
	return { conferenceId };
};
