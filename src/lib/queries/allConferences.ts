import { graphql } from '$houdini';

export const allConferenceQuery = graphql(`
	query AllConferencesQuery {
		findManyConferences(orderBy: { startConference: desc }) {
			id
			title
		}
	}
`);
