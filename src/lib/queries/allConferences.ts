import { graphql } from '$houdini';

export const allConferenceQuery = graphql(`
	query AllConferencesQuery {
		findManyConferences {
			id
			title
		}
	}
`);
