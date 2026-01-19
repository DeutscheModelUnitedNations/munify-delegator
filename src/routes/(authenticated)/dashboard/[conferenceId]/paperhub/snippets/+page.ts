import { graphql } from '$houdini';

export const _houdini_load = graphql(`
	query MySnippetsQuery {
		myReviewerSnippets {
			id
			name
			content
			createdAt
			updatedAt
		}
	}
`);
