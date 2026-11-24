import { client } from '#lib/api/rumbleClient/client';

/** The person's papers. Drafts are the author's own business; the card only shows submitted work. */
export function fetchPapers({ userId, conferenceId }: { userId: string; conferenceId: string }) {
	return client.liveQuery.papers({
		__args: {
			where: {
				conference: { id: { eq: conferenceId } },
				author: { id: { eq: userId } },
				NOT: { status: 'DRAFT' }
			}
		},
		id: true,
		type: true,
		status: true,
		firstSubmittedAt: true,
		agendaItem: { id: true, title: true, committee: { id: true, abbreviation: true } },
		versions: { id: true, reviews: { id: true } }
	});
}

const statusBadges: Partial<Record<string, string>> = {
	ACCEPTED: 'badge-success',
	CHANGES_REQUESTED: 'badge-error',
	SUBMITTED: 'badge-info',
	REVISED: 'badge-accent'
};

/** The badge color of a paper's status. */
export const paperStatusBadge = (status: string) => statusBadges[status] ?? 'badge-ghost';
