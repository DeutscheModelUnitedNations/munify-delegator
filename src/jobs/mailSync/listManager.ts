import { listmonkClient } from '../apis/listmonk/listmonkClient';
import { taskError } from '../logs';
import { GLOBAL_LIST_TYPES, CONFERENCE_LIST_TYPES } from './types';
import {
	createConferenceListName,
	createGlobalListName,
	createTagName,
	isManagedListName
} from './listNames';

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
async function ensureList(
	existingLists: ExistingList[] | undefined,
	listNameToId: Map<string, number>,
	list: { name: string; description: string; tags: string[] },
	label: string
) {
	const existing = existingLists?.find((l) => l.name === list.name);
	if (existing) {
		listNameToId.set(existing.name!, existing.id!);
		console.info(`  - List ${list.name} already exists`);
		return true;
	}

	const res = await listmonkClient.POST('/lists', { body: list });
	if (res.error || !res.data.data || !res.data.data.uuid || !res.data.data.name) {
		taskError(TASK_NAME, `Failed to create list ${label}. Aborting task.`, errorToString(res));
		return false;
	}
	listNameToId.set(res.data.data.name!, res.data.data.id!);
	console.info(`  - Created list ${list.name}`);
	return true;
}

/** Deletes lists that follow our naming convention ([global] or [shortId]) but are not needed. */
async function deleteOrphanLists(existingLists: ExistingList[] | undefined, validIds: Set<number>) {
	console.info('Cleaning up orphan lists');
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
			console.info(
				`  ! Failed to delete list ${list.name}: Listmonk API Error\n${errorToString(res)}`
			);
			continue;
		}
		console.info(`  - Deleted list ${list.name}`);
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
		const name = createGlobalListName(listType);
		const ok = await ensureList(
			existingLists,
			listNameToId,
			{ name, description: `List for ${name} (global)`, tags: ['global'] },
			`${name} (global)`
		);
		if (!ok) return undefined;
	}

	// Ensure per-conference lists
	for (const conference of conferences) {
		console.info(`Syncing Lists for conference ${conference.title}`);

		for (const listType of CONFERENCE_LIST_TYPES) {
			const ok = await ensureList(
				existingLists,
				listNameToId,
				{
					name: createConferenceListName(conference.title, conference.id, listType),
					description: `List for ${listType} of conference ${conference.title}`,
					tags: [createTagName(conference.title, conference.id), listType.toLowerCase()]
				},
				`${listType} for conference ${conference.title}`
			);
			if (!ok) return undefined;
		}
	}

	await deleteOrphanLists(existingLists, new Set(listNameToId.values()));

	return listNameToId;
}
