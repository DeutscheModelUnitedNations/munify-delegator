import { client } from '$lib/api/rumbleClient/client';
import type { PageLoad } from './$types';

export const load: PageLoad = async (event) => {
	return {
		conference: await client.query.conference({
			__args: { id: event.params.conferenceId },
			id: true,
			title: true,
			committees: {
				id: true,
				abbreviation: true,
				name: true,
				numOfSeatsPerDelegation: true,
				nations: { alpha2Code: true, alpha3Code: true },
				agendaItems: { id: true, title: true, teaserText: true }
			},
			nonStateActors: {
				id: true,
				abbreviation: true,
				name: true,
				description: true,
				fontAwesomeIcon: true,
				seatAmount: true
			}
		})
	};
};
