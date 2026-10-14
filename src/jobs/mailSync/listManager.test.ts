import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
	client: { GET: vi.fn(), POST: vi.fn(), DELETE: vi.fn() },
	taskError: vi.fn()
}));

vi.mock('../apis/listmonk/listmonkClient', () => ({ listmonkClient: mocks.client }));
vi.mock('../logs', () => ({ taskError: mocks.taskError }));

const { ensureListsExist } = await import('./listManager');
const { CONFERENCE_LIST_TYPES } = await import('./types');

const conference = { id: 'abcdef123', title: 'MUN SH' };
const globalNames = ['[global] DMUN_NEWSLETTER', '[global] DMUN_TEAM_TENDERS'];
const conferenceNames = CONFERENCE_LIST_TYPES.map((type) => `[abcdef] MUN SH - ${type}`);

/** Listmonk already holds these lists, with ids counting up from 1. */
function existingLists(names: string[]) {
	mocks.client.GET.mockResolvedValue({
		data: { data: { results: names.map((name, index) => ({ id: index + 1, name })) } }
	});
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

describe('ensureListsExist', () => {
	beforeEach(() => {
		vi.spyOn(console, 'info').mockImplementation(() => {});
		mocks.client.DELETE.mockResolvedValue({});
	});

	afterEach(() => {
		vi.restoreAllMocks();
		vi.resetAllMocks();
	});

	test('aborts when the lists cannot be fetched', async () => {
		mocks.client.GET.mockResolvedValue({ error: 'unauthorized' });
		expect(await ensureListsExist([conference])).toBeUndefined();
		expect(mocks.taskError).toHaveBeenCalledWith(
			'Mail Service: Sync with Listmonk',
			'Failed to fetch lists from Listmonk. Aborting task.',
			'unauthorized'
		);
		expect(mocks.client.POST).not.toHaveBeenCalled();
	});

	test('keeps existing lists and creates the missing ones, tagged by conference and type', async () => {
		existingLists([...globalNames, conferenceNames[0]]);
		createSucceeds();

		const ids = await ensureListsExist([conference]);

		expect(ids?.get(globalNames[0])).toBe(1);
		expect(ids?.get(conferenceNames[0])).toBe(3);
		expect(ids?.get(conferenceNames[1])).toBe(100);
		expect(ids?.size).toBe(2 + CONFERENCE_LIST_TYPES.length);
		expect(mocks.client.POST).toHaveBeenCalledTimes(CONFERENCE_LIST_TYPES.length - 1);
		expect(mocks.client.POST).toHaveBeenCalledWith('/lists', {
			body: {
				name: conferenceNames[1],
				description: `List for ${CONFERENCE_LIST_TYPES[1]} of conference MUN SH`,
				tags: ['abcdef-mun_sh', CONFERENCE_LIST_TYPES[1].toLowerCase()]
			}
		});
		expect(mocks.client.DELETE).not.toHaveBeenCalled();
	});

	test('creates the global lists when Listmonk has no lists at all', async () => {
		mocks.client.GET.mockResolvedValue({ data: {} });
		createSucceeds();

		const ids = await ensureListsExist([]);
		expect([...(ids?.keys() ?? [])]).toEqual(globalNames);
		expect(mocks.client.POST).toHaveBeenCalledWith('/lists', {
			body: {
				name: globalNames[0],
				description: `List for ${globalNames[0]} (global)`,
				tags: ['global']
			}
		});
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
		expect(mocks.taskError).toHaveBeenCalledWith(
			'Mail Service: Sync with Listmonk',
			`Failed to create list ${globalNames[0]} (global). Aborting task.`,
			error
		);
	});

	test('aborts when creating a conference list fails', async () => {
		existingLists(globalNames);
		mocks.client.POST.mockResolvedValue({ error: 'nope' });
		expect(await ensureListsExist([conference])).toBeUndefined();
		expect(mocks.taskError).toHaveBeenCalledWith(
			'Mail Service: Sync with Listmonk',
			`Failed to create list ${CONFERENCE_LIST_TYPES[0]} for conference MUN SH. Aborting task.`,
			'nope'
		);
	});

	test('deletes managed lists nothing needs anymore, and leaves foreign lists alone', async () => {
		existingLists([
			...globalNames,
			...conferenceNames,
			'[zzzzzz] Alte Konferenz - TEAM',
			'[DMUN-Intern] Rundbrief',
			''
		]);
		mocks.client.DELETE.mockResolvedValueOnce({ error: 'locked' });

		const ids = await ensureListsExist([conference]);

		expect(ids?.size).toBe(2 + CONFERENCE_LIST_TYPES.length);
		expect(mocks.client.DELETE).toHaveBeenCalledOnce();
		expect(mocks.client.DELETE).toHaveBeenCalledWith('/lists/{list_id}', {
			params: { path: { list_id: 2 + CONFERENCE_LIST_TYPES.length + 1 } }
		});
		expect(console.info).toHaveBeenCalledWith(
			'  ! Failed to delete list [zzzzzz] Alte Konferenz - TEAM: Listmonk API Error\nlocked'
		);
	});

	test('reports each deleted list', async () => {
		existingLists([...globalNames, ...conferenceNames, '[zzzzzz] Alte Konferenz - TEAM']);
		await ensureListsExist([conference]);
		expect(console.info).toHaveBeenCalledWith('  - Deleted list [zzzzzz] Alte Konferenz - TEAM');
	});
});
