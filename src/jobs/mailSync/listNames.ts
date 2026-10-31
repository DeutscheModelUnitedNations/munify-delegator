import type { ConferenceListType, GlobalListType, ListKey } from './types';

/**
 * List keys and names. The key is how the sync knows a list: built from ids, so it survives a
 * renamed conference. The name, description and tags are generated from the title and only ever
 * written to Listmonk; the sync never matches them, apart from adopting lists once (`listManager`).
 */

export function listKey({
	conferenceId,
	listType
}: {
	conferenceId: string | null;
	listType: GlobalListType | ConferenceListType;
}): ListKey {
	return `${conferenceId ?? 'global'}:${listType}`;
}

export function globalListKey(listType: GlobalListType) {
	return listKey({ conferenceId: null, listType });
}

export function conferenceListKey({
	conferenceId,
	listType
}: {
	conferenceId: string;
	listType: ConferenceListType;
}) {
	return listKey({ conferenceId, listType });
}

function shortenId(id: string) {
	return id.slice(0, 6);
}

export function createGlobalListName(listType: GlobalListType) {
	return `[global] ${listType}`;
}

export function createConferenceListName({
	conferenceTitle,
	conferenceId,
	listType
}: {
	conferenceTitle: string;
	conferenceId: string;
	listType: ConferenceListType;
}) {
	return `[${shortenId(conferenceId)}] ${conferenceTitle} - ${listType}`;
}

export function createTagName({
	conferenceTitle,
	conferenceId
}: {
	conferenceTitle: string;
	conferenceId: string;
}) {
	return `${shortenId(conferenceId)}-${conferenceTitle.replaceAll(' ', '_').toLowerCase()}`;
}
