import { client } from '#lib/api/rumbleClient/client';

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
			roles: { id: true },
			agendaItems: { id: true, title: true, teaserText: true }
		},
		roles: {
			id: true,
			kind: true,
			abbreviation: true,
			name: true,
			description: true,
			fontAwesomeIcon: true,
			seatAmount: true,
			nation: { alpha2Code: true, alpha3Code: true }
		}
	});
}

export type ConferenceSeats = Awaited<ReturnType<typeof fetchConferenceSeats>>;

/** The nation roles that sit in at least one committee, each with the nation it stands for. */
export function seatedNations(conference: ConferenceSeats) {
	return conference.roles.flatMap((role) =>
		role.kind === 'NATION' &&
		role.nation &&
		conference.committees.some((committee) => committee.roles.some((r) => r.id === role.id))
			? [{ id: role.id, kind: role.kind, seatAmount: role.seatAmount, nation: role.nation }]
			: []
	);
}

export type SeatedNation = ReturnType<typeof seatedNations>[number];

/** The conference's non-state actors */
export function nonStateActorsOf(conference: ConferenceSeats) {
	return conference.roles.filter((role) => role.kind === 'NON_STATE_ACTOR');
}
