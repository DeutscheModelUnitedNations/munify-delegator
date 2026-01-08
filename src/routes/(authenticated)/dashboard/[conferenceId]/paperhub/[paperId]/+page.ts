import { graphql } from '$houdini';
import type { getPaperDetailsForEditingQueryVariables } from './$houdini';

export const _houdini_load = graphql(`
	query getPaperDetailsForEditingQuery($paperId: String!) @cache(policy: NetworkOnly) {
		findUniquePaper(where: { id: $paperId }) {
			id
			type
			status
			author {
				id
			}
			conference {
				id
			}
			delegation {
				id
				assignedNation {
					alpha2Code
					alpha3Code
				}
				assignedNonStateActor {
					id
					abbreviation
					fontAwesomeIcon
				}
			}
			agendaItem {
				id
				title
				committee {
					id
					abbreviation
				}
			}
			versions {
				id
				version
				content
				contentHash
				createdAt
				status
				reviews {
					id
					comments
					createdAt
					statusBefore
					statusAfter
					reviewer {
						id
						family_name
						given_name
						email
					}
				}
			}
			firstSubmittedAt
			createdAt
			updatedAt
		}
	}
`);

export const _getPaperDetailsForEditingQueryVariables: getPaperDetailsForEditingQueryVariables = (
	event
) => {
	return {
		paperId: event.params.paperId
	};
};
