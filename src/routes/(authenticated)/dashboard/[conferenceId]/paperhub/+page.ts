import { client } from '$lib/api/rumbleClient/client';
import type { PageLoad } from './$types';

export const load: PageLoad = async (event) => {
	const { user } = await event.parent();

	return {
		myPapers: await client.query.papers({
			__args: {
				where: {
					authorId: { eq: user.sub },
					conferenceId: { eq: event.params.conferenceId }
				}
			},
			id: true,
			status: true,
			type: true,
			createdAt: true,
			updatedAt: true,
			firstSubmittedAt: true,
			agendaItem: {
				id: true,
				title: true,
				committee: { id: true, abbreviation: true }
			}
		})
	};
};
