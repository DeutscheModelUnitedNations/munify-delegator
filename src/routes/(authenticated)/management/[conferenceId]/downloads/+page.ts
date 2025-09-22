import { graphql } from '$houdini';

export const _houdini_load = graphql(`
	query DownloadsBaseDataQuery($conferenceId: String!) {
		findUniqueConference(where: { id: $conferenceId }) {
			id
			committees {
				id
				name
				abbreviation
			}
		}
	}
`);

export const _DownloadsBaseDataQueryVariables = async (event) => {
	const { conferenceId } = event.params;
	return { conferenceId };
};
