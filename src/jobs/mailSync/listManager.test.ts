import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { logger } from '#lib/logger';
import type { MailingListRow } from './mailingLists';

const mocks = vi.hoisted(() => ({
	client: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), DELETE: vi.fn() },
	taskError: vi.fn(),
	rows: [] as MailingListRow[]
}));

vi.mock('../apis/listmonk/listmonkClient', () => ({ listmonkClient: mocks.client }));
vi.mock('../logs', () => ({ taskError: mocks.taskError }));
vi.mock('./mailingLists', () => ({
	loadMailingLists: async () => structuredClone(mocks.rows),
	saveMailingList: async (row: Omit<MailingListRow, 'id'>) => {
		const existing = mocks.rows.find(
			(r) => r.conferenceId === row.conferenceId && r.listType === row.listType
		);
		if (existing) existing.listmonkListId = row.listmonkListId;
		else mocks.rows.push({ id: `row-${mocks.rows.length + 1}`, ...row });
	},
	deleteMailingList: async (id: string) => {
		mocks.rows = mocks.rows.filter((r) => r.id !== id);
	}
}));

const { ensureListsExist } = await import('./listManager');
const { CONFERENCE_LIST_TYPES } = await import('./types');

const conference = { id: 'abcdef123', title: 'MUN SH' };
const globalNames = ['[global] DMUN_NEWSLETTER', '[global] DMUN_TEAM_TENDERS'];
const conferenceNames = CONFERENCE_LIST_TYPES.map((type) => `[abcdef] MUN SH - ${type}`);
const ALL = 2 + CONFERENCE_LIST_TYPES.length;

type FakeList = { id: number; name: string; description?: string; tags?: string[] };

/** Listmonk already holds these lists, with ids counting up from 1. */
function existingLists(names: string[]) {
	mockLists(names.map((name, index) => ({ id: index + 1, name })));
}

function mockLists(results: FakeList[]) {
	mocks.client.GET.mockResolvedValue({ data: { data: { results } } });
}

/** Creating a list succeeds and hands out ids from 100. */
function createSucceeds() {
	let nextId = 100;
	mocks.client.POST.mockImplementation(
		async (_path: string, { body }: { body: { name: string } }) => ({
			data: { data: { id: nextId++, uuid: 'uuid', name: body.name } }
		})
	);
}

/** The lists Listmonk shows for `conference` and the globals, as the sync writes them. */
function currentLists(): FakeList[] {
	return [
		...globalNames.map((name, index) => ({
			id: index + 1,
			name,
			description: `List for ${name} (global)`,
			tags: ['global']
		})),
		...CONFERENCE_LIST_TYPES.map((type, index) => ({
			id: index + 3,
			name: conferenceNames[index],
			description: `List for ${type} of conference MUN SH`,
			tags: ['abcdef-mun_sh', type.toLowerCase()]
		}))
	];
}

/** Rows for everything `currentLists` holds. */
function storeCurrentRows() {
	mocks.rows = [
		{ id: 'g1', listmonkListId: 1, conferenceId: null, listType: 'DMUN_NEWSLETTER' },
		{ id: 'g2', listmonkListId: 2, conferenceId: null, listType: 'DMUN_TEAM_TENDERS' },
		...CONFERENCE_LIST_TYPES.map((listType, index) => ({
			id: `c${index}`,
			listmonkListId: index + 3,
			conferenceId: conference.id,
			listType
		}))
	];
}

describe('ensureListsExist', () => {
	beforeEach(() => {
		vi.spyOn(logger, 'info').mockImplementation(() => {});
		vi.spyOn(logger, 'error').mockImplementation(() => {});
		mocks.client.DELETE.mockResolvedValue({});
		mocks.client.PUT.mockResolvedValue({});
		mocks.rows = [];
	});

	afterEach(() => {
		vi.restoreAllMocks();
		vi.resetAllMocks();
	});

	test('aborts when the lists cannot be fetched', async () => {
		mocks.client.GET.mockResolvedValue({ error: 'unauthorized' });
		expect(await ensureListsExist([conference])).toBeUndefined();
		expect(mocks.taskError).toHaveBeenCalledWith({
			taskName: 'Mail Service: Sync with Listmonk',
			message: 'Failed to fetch lists from Listmonk. Aborting task.',
			error: 'unauthorized'
		});
		expect(mocks.client.POST).not.toHaveBeenCalled();
	});

	test('adopts lists without a row by name once, creates the missing ones and stores them all', async () => {
		existingLists([...globalNames, conferenceNames[0]]);
		createSucceeds();

		const lists = await ensureListsExist([conference]);

		expect(lists?.idOf.get('global:DMUN_NEWSLETTER')).toBe(1);
		expect(lists?.idOf.get(`${conference.id}:${CONFERENCE_LIST_TYPES[0]}`)).toBe(3);
		expect(lists?.idOf.get(`${conference.id}:${CONFERENCE_LIST_TYPES[1]}`)).toBe(100);
		expect(lists?.ids.size).toBe(ALL);
		expect(mocks.client.POST).toHaveBeenCalledTimes(CONFERENCE_LIST_TYPES.length - 1);
		expect(mocks.client.POST).toHaveBeenCalledWith('/lists', {
			body: {
				name: conferenceNames[1],
				description: `List for ${CONFERENCE_LIST_TYPES[1]} of conference MUN SH`,
				tags: ['abcdef-mun_sh', CONFERENCE_LIST_TYPES[1].toLowerCase()]
			}
		});
		expect(mocks.rows).toHaveLength(ALL);
		expect(mocks.rows).toContainEqual(
			expect.objectContaining({
				listmonkListId: 3,
				conferenceId: conference.id,
				listType: CONFERENCE_LIST_TYPES[0]
			})
		);
		expect(mocks.client.DELETE).not.toHaveBeenCalled();
	});

	test('creates the global lists when Listmonk has no lists at all', async () => {
		mocks.client.GET.mockResolvedValue({ data: {} });
		createSucceeds();

		const lists = await ensureListsExist([]);
		expect([...(lists?.idOf.keys() ?? [])]).toEqual([
			'global:DMUN_NEWSLETTER',
			'global:DMUN_TEAM_TENDERS'
		]);
		expect(mocks.client.POST).toHaveBeenCalledWith('/lists', {
			body: {
				name: globalNames[0],
				description: `List for ${globalNames[0]} (global)`,
				tags: ['global']
			}
		});
	});

	test('changes nothing when every stored list is up to date', async () => {
		mockLists(currentLists());
		storeCurrentRows();

		const lists = await ensureListsExist([conference]);

		expect(lists?.ids).toEqual(new Set(currentLists().map((l) => l.id)));
		expect(mocks.client.POST).not.toHaveBeenCalled();
		expect(mocks.client.PUT).not.toHaveBeenCalled();
		expect(mocks.client.DELETE).not.toHaveBeenCalled();
	});

	test('keeps the list of a renamed conference and renames it in Listmonk', async () => {
		mockLists(currentLists());
		storeCurrentRows();

		const lists = await ensureListsExist([{ id: conference.id, title: 'MUN SH 2027' }]);

		expect(lists?.idOf.get(`${conference.id}:TEAM`)).toBe(
			3 + CONFERENCE_LIST_TYPES.indexOf('TEAM')
		);
		expect(mocks.client.POST).not.toHaveBeenCalled();
		expect(mocks.client.DELETE).not.toHaveBeenCalled();
		expect(mocks.client.PUT).toHaveBeenCalledTimes(CONFERENCE_LIST_TYPES.length);
		expect(mocks.client.PUT).toHaveBeenCalledWith('/lists/{list_id}', {
			params: { path: { list_id: 3 } },
			body: {
				name: `[abcdef] MUN SH 2027 - ${CONFERENCE_LIST_TYPES[0]}`,
				description: `List for ${CONFERENCE_LIST_TYPES[0]} of conference MUN SH 2027`,
				tags: ['abcdef-mun_sh_2027', CONFERENCE_LIST_TYPES[0].toLowerCase()]
			}
		});
	});

	test('keeps the stored list when renaming it fails', async () => {
		mockLists(currentLists());
		storeCurrentRows();
		mocks.client.PUT.mockResolvedValue({ error: 'locked' });

		const lists = await ensureListsExist([{ id: conference.id, title: 'Neu' }]);

		expect(lists?.ids.size).toBe(ALL);
		expect(logger.error).toHaveBeenCalledWith('Failed to update list', {
			list: `[abcdef] Neu - ${CONFERENCE_LIST_TYPES[0]}`,
			error: 'locked'
		});
	});

	test('replaces a stored list that vanished from Listmonk', async () => {
		mockLists(currentLists().filter((l) => l.id !== 3));
		storeCurrentRows();
		createSucceeds();

		const lists = await ensureListsExist([conference]);

		expect(lists?.idOf.get(`${conference.id}:${CONFERENCE_LIST_TYPES[0]}`)).toBe(100);
		expect(mocks.rows.find((r) => r.id === 'c0')?.listmonkListId).toBe(100);
	});

	test('never adopts a list another row already holds', async () => {
		// The newsletter's row points at a list that is named like the team tenders list.
		mockLists([{ id: 7, name: globalNames[1], description: '', tags: [] }]);
		mocks.rows = [{ id: 'g1', listmonkListId: 7, conferenceId: null, listType: 'DMUN_NEWSLETTER' }];
		createSucceeds();

		const lists = await ensureListsExist([]);

		expect(lists?.idOf.get('global:DMUN_NEWSLETTER')).toBe(7);
		expect(lists?.idOf.get('global:DMUN_TEAM_TENDERS')).toBe(100);
	});

	test.each([
		['an error', { error: { message: 'boom' } }, '{"message":"boom"}'],
		['no list', { data: {} }, undefined],
		['a list without uuid', { data: { data: { id: 1, name: 'x' } } }, undefined],
		['a list without name', { data: { data: { id: 1, uuid: 'u' } } }, undefined]
	])('aborts when creating a global list returns %s', async (_label, response, error) => {
		existingLists([]);
		mocks.client.POST.mockResolvedValue(response);
		expect(await ensureListsExist([conference])).toBeUndefined();
		expect(mocks.taskError).toHaveBeenCalledWith({
			taskName: 'Mail Service: Sync with Listmonk',
			message: `Failed to create list ${globalNames[0]} (global). Aborting task.`,
			error
		});
		expect(mocks.rows).toEqual([]);
	});

	test('aborts when creating a conference list fails', async () => {
		existingLists(globalNames);
		mocks.client.POST.mockResolvedValue({ error: 'nope' });
		expect(await ensureListsExist([conference])).toBeUndefined();
		expect(mocks.taskError).toHaveBeenCalledWith({
			taskName: 'Mail Service: Sync with Listmonk',
			message: `Failed to create list ${CONFERENCE_LIST_TYPES[0]} for conference MUN SH. Aborting task.`,
			error: 'nope'
		});
	});

	test('deletes the lists of a deleted conference along with their rows', async () => {
		mockLists(currentLists());
		storeCurrentRows();

		const lists = await ensureListsExist([]);

		expect(lists?.ids).toEqual(new Set([1, 2]));
		expect(mocks.client.DELETE).toHaveBeenCalledTimes(CONFERENCE_LIST_TYPES.length);
		expect(mocks.client.DELETE).toHaveBeenCalledWith('/lists/{list_id}', {
			params: { path: { list_id: 3 } }
		});
		expect(logger.info).toHaveBeenCalledWith('Deleted list', { list: conferenceNames[0] });
		expect(mocks.rows.map((r) => r.id)).toEqual(['g1', 'g2']);
	});

	test('keeps the row of a list it could not delete, to try again next run', async () => {
		mockLists(currentLists());
		storeCurrentRows();
		mocks.client.DELETE.mockResolvedValueOnce({ error: 'locked' });

		await ensureListsExist([]);

		expect(logger.error).toHaveBeenCalledWith('Failed to delete list', {
			list: conferenceNames[0],
			error: 'locked'
		});
		expect(mocks.rows.map((r) => r.id)).toEqual(['g1', 'g2', 'c0']);
	});

	test('drops the row of a deleted conference whose list is already gone', async () => {
		mockLists(currentLists().slice(0, 2));
		storeCurrentRows();

		await ensureListsExist([]);

		expect(mocks.client.DELETE).not.toHaveBeenCalled();
		expect(mocks.rows.map((r) => r.id)).toEqual(['g1', 'g2']);
	});

	test('never deletes lists without a row, whatever they are called', async () => {
		existingLists([
			...globalNames,
			...conferenceNames,
			'[zzzzzz] Alte Konferenz - TEAM',
			'[DMUN-Intern] Rundbrief',
			''
		]);

		const lists = await ensureListsExist([conference]);

		expect(lists?.ids.size).toBe(ALL);
		expect(mocks.client.DELETE).not.toHaveBeenCalled();
	});
});
