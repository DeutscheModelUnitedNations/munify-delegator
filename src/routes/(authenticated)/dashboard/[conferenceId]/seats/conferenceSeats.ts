import { client } from '$lib/api/rumbleClient/client';

/** Everything the public seat overview shows: the committees with their nations, plus the NSAs. */
export function fetchConferenceSeats(conferenceId: string) {
	return client.liveQuery.conference({
		__args: { id: conferenceId },
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
	});
}

export type ConferenceSeats = Awaited<ReturnType<typeof fetchConferenceSeats>>;
