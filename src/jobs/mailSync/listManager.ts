import { listmonkClient } from '../apis/listmonk/listmonkClient';
import { taskError } from '../logs';
import { GLOBAL_LIST_TYPES, CONFERENCE_LIST_TYPES } from './types';
import {
	createConferenceListName,
	createGlobalListName,
	createTagName,
	isManagedListName
} from './listNames';
import { logger } from '#lib/logger';

const TASK_NAME = 'Mail Service: Sync with Listmonk';

function errorToString(res: { error?: unknown }): string | undefined {
	if (res.error == null) return undefined;
	return typeof res.error === 'string' ? res.error : JSON.stringify(res.error);
}

type ExistingList = { id?: number; name?: string };

/**
 * Records the id of the list with the given name, creating it first when Listmonk does not have
 * it yet. Returns false when the creation failed, after logging `label` as what was attempted.
 */
async function ensureList({
	existingLists,
	listNameToId,
	list,
	label
}: {
	existingLists: ExistingList[] | undefined;
	listNameToId: Map<string, number>;
	list: { name: string; description: string; tags: string[] };
	label: string;
}) {
	const existing = existingLists?.find((l) => l.name === list.name);
	if (existing) {
		listNameToId.set(existing.name!, existing.id!);
		logger.debug('List already exists', { list: list.name });
		return true;
	}

	const res = await listmonkClient.POST('/lists', { body: list });
	if (res.error || !res.data.data || !res.data.data.uuid || !res.data.data.name) {
		taskError({
			taskName: TASK_NAME,
			message: `Failed to create list ${label}. Aborting task.`,
			error: errorToString(res)
		});
		return false;
	}
	listNameToId.set(res.data.data.name!, res.data.data.id!);
	logger.info('Created list', { list: list.name });
	return true;
}

/** Deletes lists that follow our naming convention ([global] or [shortId]) but are not needed. */
async function deleteOrphanLists({
	existingLists,
	validIds
}: {
	existingLists: ExistingList[] | undefined;
	validIds: Set<number>;
}) {
	logger.info('Cleaning up orphan lists');
	const listsToDelete = existingLists?.filter(
		(l) => l.id && !validIds.has(l.id) && l.name && isManagedListName(l.name)
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
			logger.error('Failed to delete list', { list: list.name, error: errorToString(res) });
			continue;
		}
		logger.info('Deleted list', { list: list.name });
	}
}

/**
 * Ensures all required lists exist in Listmonk and deletes orphan lists.
 * Returns a Map of listName -> listId for O(1) lookups.
 */
export async function ensureListsExist(
	conferences: { id: string; title: string }[]
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
		taskError({
			taskName: TASK_NAME,
			message: `Failed to fetch lists from Listmonk. Aborting task.`,
			error: errorToString(listsResponse)
		});
		return undefined;
	}
	const existingLists = listsResponse.data.data?.results;

	// Ensure global lists
	logger.info('Syncing global lists');

	for (const listType of GLOBAL_LIST_TYPES) {
		const name = createGlobalListName(listType);
		const ok = await ensureList({
			existingLists,
			listNameToId,
			list: { name, description: `List for ${name} (global)`, tags: ['global'] },
			label: `${name} (global)`
		});
		if (!ok) return undefined;
	}

	// Ensure per-conference lists
	for (const conference of conferences) {
		logger.info('Syncing lists for conference', { conference: conference.title });

		for (const listType of CONFERENCE_LIST_TYPES) {
			const ok = await ensureList({
				existingLists,
				listNameToId,
				list: {
					name: createConferenceListName({
						conferenceTitle: conference.title,
						conferenceId: conference.id,
						listType
					}),
					description: `List for ${listType} of conference ${conference.title}`,
					tags: [
						createTagName({ conferenceTitle: conference.title, conferenceId: conference.id }),
						listType.toLowerCase()
					]
				},
				label: `${listType} for conference ${conference.title}`
			});
			if (!ok) return undefined;
		}
	}

	await deleteOrphanLists({ existingLists, validIds: new Set(listNameToId.values()) });

	return listNameToId;
}
