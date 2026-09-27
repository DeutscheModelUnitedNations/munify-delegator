import { client } from '$lib/api/rumbleClient/client';
import type { PageLoad } from './$types';

export const load: PageLoad = async (event) => {
	return {
		paper: await client.query.paper({
			__args: { id: event.params.paperId },
			id: true,
			type: true,
			status: true,
			author: { id: true },
			conference: { id: true, title: true, longTitle: true, emblemDataURL: true },
			delegation: {
				id: true,
				assignedNation: { alpha2Code: true, alpha3Code: true },
				assignedNonStateActor: {
					id: true,
					name: true,
					abbreviation: true,
					fontAwesomeIcon: true
				}
			},
			agendaItem: {
				id: true,
				title: true,
				committee: { id: true, abbreviation: true, name: true, resolutionHeadline: true }
			},
			versions: {
				id: true,
				version: true,
				content: true,
				contentHash: true,
				createdAt: true,
				status: true,
				reviews: {
					id: true,
					comments: true,
					createdAt: true,
					statusBefore: true,
					statusAfter: true,
					reviewer: { id: true, familyName: true, givenName: true, email: true }
				}
			},
			firstSubmittedAt: true,
			createdAt: true,
			updatedAt: true
		})
	};
};
