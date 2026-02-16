import type { Conference } from '@prisma/client';
import { listmonkClient } from '../apis/listmonk/listmonkClient';
import { taskError } from '../logs';
import {
	GLOBAL_LIST_TYPES,
	CONFERENCE_LIST_TYPES,
	type GlobalListType,
	type ConferenceListType
} from './types';

const TASK_NAME = 'Mail Service: Sync with Listmonk';

function errorToString(res: { error?: unknown }): string | undefined {
	if (res.error == null) return undefined;
	return typeof res.error === 'string' ? res.error : JSON.stringify(res.error);
}

// Naming functions

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

/**
 * Ensures all required lists exist in Listmonk and deletes orphan lists.
 * Returns a Map of listName -> listId for O(1) lookups.
 */
export async function ensureListsExist(
	conferences: Conference[]
): Promise<Map<string, number> | undefined> {
	const listNameToId = new Map<string, number>();

	const listsResponse = await listmonkClient.GET('/lists', {
		params: {
			query: {
				per_page: 500
			}
		}
	});
	if (listsResponse.error) {
		taskError(
			TASK_NAME,
			`Failed to fetch lists from Listmonk. Aborting task.`,
			errorToString(listsResponse)
		);
		return undefined;
	}
	const existingLists = listsResponse.data.data?.results;

	// Ensure global lists
	console.info(`Syncing Global Lists`);

	for (const listType of GLOBAL_LIST_TYPES) {
		const listName = createGlobalListName(listType);
		const existing = existingLists?.find((l) => l.name === listName);
		if (!existing) {
			const res = await listmonkClient.POST('/lists', {
				body: {
					name: listName,
					description: `List for ${listName} (global)`,
					tags: ['global']
				}
			});
			if (res.error || !res.data.data || !res.data.data.uuid || !res.data.data.name) {
				taskError(
					TASK_NAME,
					`Failed to create list ${listName} (global). Aborting task.`,
					errorToString(res)
				);
				return undefined;
			}
			listNameToId.set(res.data.data.name!, res.data.data.id!);
			console.info(`  - Created list ${listName}`);
		} else {
			listNameToId.set(existing.name!, existing.id!);
			console.info(`  - List ${listName} already exists`);
		}
	}

	// Ensure per-conference lists
	for (const conference of conferences) {
		console.info(`Syncing Lists for conference ${conference.title}`);

		for (const listType of CONFERENCE_LIST_TYPES) {
			const listName = createConferenceListName(conference.title, conference.id, listType);
			const existing = existingLists?.find((l) => l.name === listName);
			if (!existing) {
				const res = await listmonkClient.POST('/lists', {
					body: {
						name: listName,
						description: `List for ${listType} of conference ${conference.title}`,
						tags: [createTagName(conference.title, conference.id), listType.toLowerCase()]
					}
				});
				if (res.error || !res.data.data || !res.data.data.uuid || !res.data.data.name) {
					taskError(
						TASK_NAME,
						`Failed to create list ${listType} for conference ${conference.title}. Aborting task.`,
						errorToString(res)
					);
					return undefined;
				}
				listNameToId.set(res.data.data.name!, res.data.data.id!);
				console.info(`  - Created list ${listName}`);
			} else {
				listNameToId.set(existing.name!, existing.id!);
				console.info(`  - List ${existing.name} already exists`);
			}
		}
	}

	// Delete orphan lists (only those matching our naming convention: [global] or [shortId])
	console.info('Cleaning up orphan lists');
	const managedListPattern = /^\[(?:global|[a-f0-9]{6})\] /;
	const validIds = new Set(listNameToId.values());
	const listsToDelete = existingLists?.filter(
		(l) => l.id && !validIds.has(l.id) && l.name && managedListPattern.test(l.name)
	);
	for (const list of listsToDelete || []) {
		const res = await listmonkClient.DELETE(`/lists/{list_id}`, {
			params: {
				path: {
					list_id: list.id!
				}
			}
		});
		if (res.error) {
			console.info(
				`  ! Failed to delete list ${list.name}: Listmonk API Error\n${errorToString(res)}`
			);
			continue;
		}
		console.info(`  - Deleted list ${list.name}`);
	}

	return listNameToId;
}
