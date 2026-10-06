import {
	CONFERENCE_LIST_TYPES,
	GLOBAL_LIST_TYPES,
	type ConferenceListType,
	type GlobalListType
} from './types';

/**
 * List naming. The name is also how the sync tells its own lists apart from lists other systems
 * keep in the same Listmonk instance (e.g. the DMUN member hub with its "[DMUN-Intern]" lists):
 * everything matching {@link isManagedListName} belongs to the delegator, nothing else is ever
 * touched.
 *
 * The pattern is built from the list types rather than from the bracket prefix alone, so that a
 * foreign list that happens to start with six characters in brackets is not claimed. Conference
 * ids are nanoids, so the prefix may contain any of `A-Za-z0-9_-`.
 */
const MANAGED_LIST_PATTERN = new RegExp(
	`^(?:\\[global\\] (?:${GLOBAL_LIST_TYPES.join('|')})` +
		`|\\[[A-Za-z0-9_-]{6}\\] .* - (?:${CONFERENCE_LIST_TYPES.join('|')}))$`
);

export function isManagedListName(name: string) {
	return MANAGED_LIST_PATTERN.test(name);
}

export function shortenId(id: string) {
	return id.slice(0, 6);
}

export function createGlobalListName(listType: GlobalListType) {
	return `[global] ${listType}`;
}

export function createConferenceListName(
	conferenceTitle: string,
	conferenceId: string,
	listType: ConferenceListType
) {
	return `[${shortenId(conferenceId)}] ${conferenceTitle} - ${listType}`;
}

export function createTagName(conferenceTitle: string, conferenceId: string) {
	return `${shortenId(conferenceId)}-${conferenceTitle.replaceAll(' ', '_').toLowerCase()}`;
}
