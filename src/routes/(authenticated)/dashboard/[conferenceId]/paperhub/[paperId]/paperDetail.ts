import { client } from '$lib/api/rumbleClient/client';

/**
 * What the paper page itself renders: the paper's identity for the header and export, who wrote
 * it, and only its latest version to seed the editor. The full version and review history is
 * fetched by `PaperHistory`, which is the only place that shows it.
 */
export function fetchPaperDetail(paperId: string) {
	return client.liveQuery.paper({
		__args: { id: paperId },
		id: true,
		type: true,
		status: true,
		createdAt: true,
		firstSubmittedAt: true,
		author: { id: true },
		conference: { title: true, longTitle: true, emblemDataURL: true },
		delegation: {
			id: true,
			assignedNation: { alpha2Code: true, alpha3Code: true },
			assignedNonStateActor: { name: true, fontAwesomeIcon: true }
		},
		agendaItem: {
			id: true,
			title: true,
			committee: { abbreviation: true, name: true, resolutionHeadline: true }
		},
		versions: {
			__args: { orderBy: { version: 'desc' }, limit: 1 },
			id: true,
			version: true,
			content: true,
			contentHash: true
		}
	});
}

export type PaperDetail = NonNullable<Awaited<ReturnType<typeof fetchPaperDetail>>>;
