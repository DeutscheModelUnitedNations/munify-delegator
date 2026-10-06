import type { ConferencestateEnum } from '$lib/api/rumbleClient/client';

export type ConferenceGroupKey = 'active' | 'registration' | 'preparation' | 'upcoming' | 'past';

interface Groupable {
	state: ConferencestateEnum;
	startConference: Date;
}

/** Top to bottom: what is happening now first, what is over last. */
const groupOrder: { key: ConferenceGroupKey; state: ConferencestateEnum }[] = [
	{ key: 'active', state: 'ACTIVE' },
	{ key: 'registration', state: 'PARTICIPANT_REGISTRATION' },
	{ key: 'preparation', state: 'PREPARATION' },
	{ key: 'upcoming', state: 'PRE' },
	{ key: 'past', state: 'POST' }
];

/**
 * Sorts conferences into their lifecycle groups, leaving out empty ones. Within a group the
 * nearest conference comes first; past ones run newest first.
 */
export function groupConferencesByState<T extends Groupable>(conferences: readonly T[]) {
	return groupOrder
		.map(({ key, state }) => ({
			key,
			conferences: conferences
				.filter((conference) => conference.state === state)
				.toSorted((a, b) => {
					const byStart = a.startConference.getTime() - b.startConference.getTime();
					return key === 'past' ? -byStart : byStart;
				})
		}))
		.filter((group) => group.conferences.length > 0);
}
