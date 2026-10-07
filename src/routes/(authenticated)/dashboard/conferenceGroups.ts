import type { ConferencestateEnum } from '$lib/api/rumbleClient/client';
import { m } from '$lib/paraglide/messages';

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

const groupLabels: Record<ConferenceGroupKey, () => string> = {
	active: m.activeConferences,
	registration: m.conferencesRegistrationOpen,
	preparation: m.conferencesInPreparation,
	upcoming: m.upcomingConferences,
	past: m.pastConferences
};

/** The heading a group goes by, wherever conferences are listed. */
export function conferenceGroupLabel(key: ConferenceGroupKey) {
	return groupLabels[key]();
}

const groupIcons: Record<ConferenceGroupKey, string> = {
	active: 'fa-circle-play',
	registration: 'fa-envelope-open-text',
	preparation: 'fa-list-check',
	upcoming: 'fa-calendar-clock',
	past: 'fa-flag-checkered'
};

/** The FontAwesome Duotone icon of a group, wherever conferences are listed. */
export function conferenceGroupIcon(key: ConferenceGroupKey) {
	return `fa-duotone ${groupIcons[key]}`;
}

/** The icon a conference state goes by: the one of the group that state lands in. */
export function conferenceStateIcon(state: ConferencestateEnum) {
	const group = groupOrder.find((entry) => entry.state === state);
	return group ? conferenceGroupIcon(group.key) : conferenceGroupIcon('upcoming');
}
