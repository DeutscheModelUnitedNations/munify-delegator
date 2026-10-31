import { listmonkClient } from '../apis/listmonk/listmonkClient';
import { taskError } from '../logs';
import {
	GLOBAL_LIST_TYPES,
	CONFERENCE_LIST_TYPES,
	type ConferenceListType,
	type GlobalListType,
	type ListKey,
	type ManagedLists
} from './types';
import {
	createConferenceListName,
	createGlobalListName,
	createTagName,
	listKey
} from './listNames';
import {
	deleteMailingList,
	loadMailingLists,
	saveMailingList,
	type MailingListRow
} from './mailingLists';
import { logger } from '#lib/logger';

const TASK_NAME = 'Mail Service: Sync with Listmonk';

function errorToString(res: { error?: unknown }): string | undefined {
	if (res.error == null) return undefined;
	return typeof res.error === 'string' ? res.error : JSON.stringify(res.error);
}

type ExistingList = { id?: number; name?: string; tags?: string[] };

/** A list the sync wants, with what Listmonk should show for it. */
type DesiredList = {
	key: ListKey;
	conferenceId: string | null;
	listType: GlobalListType | ConferenceListType;
	name: string;
	description: string;
	tags: string[];
	/** What the logs call it. */
	label: string;
};

function desiredLists(conferences: { id: string; title: string }[]): DesiredList[] {
	const globals = GLOBAL_LIST_TYPES.map((listType) => {
		const name = createGlobalListName(listType);
		return {
			key: listKey({ conferenceId: null, listType }),
			conferenceId: null,
			listType,
			name,
			description: `List for ${name} (global)`,
			tags: ['global'],
			label: `${name} (global)`
		};
	});
	const perConference = conferences.flatMap((conference) =>
		CONFERENCE_LIST_TYPES.map((listType) => ({
			key: listKey({ conferenceId: conference.id, listType }),
			conferenceId: conference.id,
			listType,
			name: createConferenceListName({
				conferenceTitle: conference.title,
				conferenceId: conference.id,
				listType
			}),
			description: `List for ${listType} of conference ${conference.title}`,
			tags: [
				createTagName({ conferenceTitle: conference.title, conferenceId: conference.id }),
				listType.toLowerCase()
			],
			label: `${listType} for conference ${conference.title}`
		}))
	);
	return [...globals, ...perConference];
}

/**
 * Listmonk's lists carry a description only in newer versions (the generated types know none),
 * so it is compared when the response has one.
 */
function isOutdated({ existing, list }: { existing: ExistingList; list: DesiredList }) {
	const description = 'description' in existing ? existing.description : list.description;
	return (
		existing.name !== list.name ||
		description !== list.description ||
		(existing.tags ?? []).join('\n') !== list.tags.join('\n')
	);
}

/** Brings name, description and tags in line with the conference, e.g. after a rename. */
async function updateList({ id, list }: { id: number; list: DesiredList }) {
	const res = await listmonkClient.PUT('/lists/{list_id}', {
		params: { path: { list_id: id } },
		body: { name: list.name, description: list.description, tags: list.tags }
	});
	if (res.error) {
		// The list is still the right one, only its label is stale; the next run tries again.
		logger.error('Failed to update list', { list: list.name, error: errorToString(res) });
		return;
	}
	logger.info('Updated list', { list: list.name });
}

async function createList(list: DesiredList): Promise<number | undefined> {
	const res = await listmonkClient.POST('/lists', {
		body: { name: list.name, description: list.description, tags: list.tags }
	});
	const id = res.data?.data?.id;
	if (res.error || id === undefined || !res.data?.data?.uuid || !res.data.data.name) {
		taskError({
			taskName: TASK_NAME,
			message: `Failed to create list ${list.label}. Aborting task.`,
			error: errorToString(res)
		});
		return undefined;
	}
	logger.info('Created list', { list: list.name });
	return id;
}

/**
 * The Listmonk id of one desired list: the stored one while Listmonk still has it, otherwise an
 * adopted or new list, which is then stored. Returns undefined when the list could not be created.
 */
async function ensureList({
	list,
	row,
	existingById,
	existingLists,
	claimedIds
}: {
	list: DesiredList;
	row: MailingListRow | undefined;
	existingById: Map<number, ExistingList>;
	existingLists: ExistingList[];
	claimedIds: Set<number>;
}): Promise<number | undefined> {
	const stored = row && existingById.get(row.listmonkListId);
	if (row && stored) {
		if (isOutdated({ existing: stored, list })) await updateList({ id: row.listmonkListId, list });
		return row.listmonkListId;
	}

	// The only lookup by name: deployments from before `mailing_list` know their lists by name
	// alone, so a list without a row is adopted once if Listmonk has one named like it.
	const adopted = existingLists.find(
		(l) => l.name === list.name && l.id !== undefined && !claimedIds.has(l.id)
	)?.id;
	const id = adopted ?? (await createList(list));
	if (id === undefined) return undefined;
	if (adopted !== undefined) logger.info('Adopted list', { list: list.name });

	await saveMailingList({
		conferenceId: list.conferenceId,
		listType: list.listType,
		listmonkListId: id
	});
	claimedIds.add(id);
	return id;
}

/**
 * Deletes the lists of conferences that are gone: the Listmonk list first, then its row, so a
 * failed delete is retried next run. Lists without a row are never deleted, whatever their name:
 * they belong to other systems (the old name-pattern cleanup is gone with the names).
 */
async function deleteUnneededLists({
	rows,
	neededKeys,
	existingById
}: {
	rows: MailingListRow[];
	neededKeys: Set<ListKey>;
	existingById: Map<number, ExistingList>;
}) {
	for (const row of rows.filter((r) => !neededKeys.has(listKey(r)))) {
		const name = existingById.get(row.listmonkListId)?.name;
		if (name !== undefined) {
			const res = await listmonkClient.DELETE('/lists/{list_id}', {
				params: { path: { list_id: row.listmonkListId } }
			});
			if (res.error) {
				logger.error('Failed to delete list', { list: name, error: errorToString(res) });
				continue;
			}
			logger.info('Deleted list', { list: name });
		}
		await deleteMailingList(row.id);
	}
}

/**
 * Ensures every list the sync needs exists in Listmonk, named after its conference, and deletes
 * the lists of deleted conferences. Lists are known by the ids in `mailing_list`, not by name.
 */
export async function ensureListsExist(
	conferences: { id: string; title: string }[]
): Promise<ManagedLists | undefined> {
	const listsResponse = await listmonkClient.GET('/lists', {
		params: { query: { per_page: 500 } }
	});
	if (listsResponse.error) {
		taskError({
			taskName: TASK_NAME,
			message: `Failed to fetch lists from Listmonk. Aborting task.`,
			error: errorToString(listsResponse)
		});
		return undefined;
	}
	const existingLists: ExistingList[] = listsResponse.data.data?.results ?? [];
	const existingById = new Map<number, ExistingList>();
	for (const l of existingLists) if (l.id !== undefined) existingById.set(l.id, l);

	const rows = await loadMailingLists();
	const rowByKey = new Map(rows.map((row) => [listKey(row), row]));
	const claimedIds = new Set(rows.map((row) => row.listmonkListId));

	logger.info('Syncing lists', { conferences: conferences.length });
	const idOf = new Map<ListKey, number>();
	for (const list of desiredLists(conferences)) {
		const id = await ensureList({
			list,
			row: rowByKey.get(list.key),
			existingById,
			existingLists,
			claimedIds
		});
		if (id === undefined) return undefined;
		idOf.set(list.key, id);
	}

	await deleteUnneededLists({ rows, neededKeys: new Set(idOf.keys()), existingById });

	return { idOf, ids: new Set(idOf.values()) };
}
