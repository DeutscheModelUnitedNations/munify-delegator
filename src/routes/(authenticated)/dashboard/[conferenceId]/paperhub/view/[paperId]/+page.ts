import { graphql } from '$houdini';
import type { getPublicPaperContentQueryVariables } from './$houdini';

export const _houdini_load = graphql(`
	query getPublicPaperContentQuery($paperId: String!) @cache(policy: NetworkOnly) {
		findPublicPaperContent(paperId: $paperId) {
			id
			type
			status
			conference {
				id
				title
				longTitle
				emblemDataURL
			}
			delegation {
				id
				assignedNation {
					alpha2Code
					alpha3Code
				}
				assignedNonStateActor {
					id
					name
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
					name
					resolutionHeadline
				}
			}
			versions {
				id
				version
				content
				createdAt
			}
			firstSubmittedAt
			createdAt
		}
	}
`);

export const _getPublicPaperContentQueryVariables: getPublicPaperContentQueryVariables = (
	event
) => {
	return {
		paperId: event.params.paperId
	};
};
