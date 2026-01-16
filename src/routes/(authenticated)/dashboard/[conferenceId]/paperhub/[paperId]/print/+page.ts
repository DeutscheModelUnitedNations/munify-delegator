import { graphql } from '$houdini';
import type { getPaperForPrintQueryVariables } from './$houdini';

export const _houdini_load = graphql(`
	query getPaperForPrintQuery($paperId: String!) @cache(policy: NetworkOnly) {
		findUniquePaper(where: { id: $paperId }) {
			id
			type
			status
			conference {
				id
				title
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
			}
		}
	}
`);

export const _getPaperForPrintQueryVariables: getPaperForPrintQueryVariables = (event) => {
	return {
		paperId: event.params.paperId
	};
};
