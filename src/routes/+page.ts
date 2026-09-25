import { client } from '$lib/api/rumbleClient/client';
import type { PageLoad } from './$types';

export const load: PageLoad = async () => {
	return {
		conferences: await client.query.conferences({
			state: true,
			startAssignment: true,
			location: true,
			title: true,
			id: true,
			totalSeats: true,
			totalParticipants: true,
			waitingListLength: true
		})
	};
};
