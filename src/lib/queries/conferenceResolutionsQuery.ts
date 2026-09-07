import { graphql } from '$houdini';

export const conferenceResolutionsQuery = graphql(`
	query ConferenceResolutionsQuery($conferenceId: String!) {
		findManyResolutions(
			where: { conferenceId: { equals: $conferenceId } }
			orderBy: [{ createdAt: asc }]
		) {
			id
			title
			fileName
			committee {
				id
				name
				abbreviation
			}
		}
	}
`);
