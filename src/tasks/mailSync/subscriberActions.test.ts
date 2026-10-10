import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import type { SubscriberAction } from './types';

const client = vi.hoisted(() => ({ GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn() }));

vi.mock('../apis/listmonk/listmonkClient', () => ({ listmonkClient: client }));

const { collectGarbage, executeActions } = await import('./subscriberActions');

const attribs = { userId: 'u1', conferences: [] };

const create: SubscriberAction = {
	kind: 'create',
	userId: 'u1',
	email: "o'brien@example.org",
	name: 'Erika',
	attribs,
	listIds: [1, 2]
};

const update = (patch?: { name?: string; attribs: Record<string, unknown> }): SubscriberAction => ({
	kind: 'update',
	subscriberId: 7,
	addListIds: [1],
	removeListIds: [2],
	patch
});

describe('executeActions', () => {
	beforeEach(() => {
		vi.spyOn(console, 'info').mockImplementation(() => {});
		vi.spyOn(console, 'error').mockImplementation(() => {});
		for (const method of Object.values(client)) method.mockResolvedValue({});
	});

	afterEach(() => {
		vi.restoreAllMocks();
		vi.resetAllMocks();
	});

	test('does nothing without actions', async () => {
		expect(await executeActions('releases', [])).toEqual({ succeeded: 0, failed: 0 });
		expect(console.info).not.toHaveBeenCalled();
	});

	test('creates subscribers on their lists, preconfirmed', async () => {
		expect(await executeActions('user changes', [create])).toEqual({ succeeded: 1, failed: 0 });
		expect(client.POST).toHaveBeenCalledWith('/subscribers', {
			body: {
				email: "o'brien@example.org",
				name: 'Erika',
				status: 'enabled',
				attribs,
				lists: [1, 2],
				preconfirm_subscriptions: true
			}
		});
		expect(console.info).toHaveBeenCalledWith('  - Created user u1 [1/1]');
	});

	test('updates lists through add/remove and everything else through PATCH', async () => {
		const patch = { name: 'Erika M.', attribs };
		expect(await executeActions('user changes', [update(patch)])).toEqual({
			succeeded: 1,
			failed: 0
		});
		expect(client.PUT).toHaveBeenCalledWith('/subscribers/lists', {
			body: { ids: [7], action: 'add', target_list_ids: [1], status: 'confirmed' }
		});
		expect(client.PUT).toHaveBeenCalledWith('/subscribers/lists', {
			body: { ids: [7], action: 'remove', target_list_ids: [2] }
		});
		expect(client.PATCH).toHaveBeenCalledWith('/subscribers/{id}', {
			params: { path: { id: 7 } },
			body: patch
		});
		expect(console.info).toHaveBeenCalledWith('  - Updated subscriber 7 [1/1]');
	});

	test('skips list changes and patches that are empty', async () => {
		await executeActions('releases', [
			{ kind: 'update', subscriberId: 7, addListIds: [], removeListIds: [], patch: undefined }
		]);
		expect(client.PUT).not.toHaveBeenCalled();
		expect(client.PATCH).not.toHaveBeenCalled();
	});

	test('counts and reports every failed step of an update', async () => {
		client.PUT.mockResolvedValue({ error: 'list error' });
		client.PATCH.mockResolvedValue({ error: { message: 'bad attribs' } });

		const result = await executeActions('user changes', [update({ attribs }), update()]);

		expect(result).toEqual({ succeeded: 0, failed: 2 });
		expect(console.error).toHaveBeenCalledWith(
			'  ! Failed to update subscriber 7: Listmonk API Error\nadd lists: list error\nremove lists: list error\npatch: {\n  "message": "bad attribs"\n}'
		);
		expect(console.info).toHaveBeenCalledWith('user changes finished: 0 succeeded, 2 failed');
	});

	test('joins a subscriber another system created in the meantime', async () => {
		client.POST.mockResolvedValue({ error: 'exists' });
		client.GET.mockResolvedValue({ data: { data: { results: [{ id: 9 }] } } });

		expect(await executeActions('user changes', [create])).toEqual({ succeeded: 1, failed: 0 });
		expect(client.GET).toHaveBeenCalledWith('/subscribers', {
			params: {
				query: {
					query: "LOWER(subscribers.email) = LOWER('o''brien@example.org')",
					per_page: 1
				}
			}
		});
		expect(client.PUT).toHaveBeenCalledWith('/subscribers/lists', {
			body: { ids: [9], action: 'add', target_list_ids: [1, 2], status: 'confirmed' }
		});
		expect(client.PATCH).toHaveBeenCalledWith('/subscribers/{id}', {
			params: { path: { id: 9 } },
			body: { attribs }
		});
	});

	test('fails a create that finds no subscriber to join', async () => {
		client.POST.mockResolvedValue({ error: 'invalid email' });

		expect(await executeActions('user changes', [create])).toEqual({ succeeded: 0, failed: 1 });
		expect(console.error).toHaveBeenCalledWith(
			'  ! Failed to create user u1: Listmonk API Error\ncreate: invalid email'
		);
	});
});

describe('collectGarbage', () => {
	afterEach(() => {
		vi.restoreAllMocks();
		vi.resetAllMocks();
	});

	test('deletes every subscriber on no list who is not blocklisted', async () => {
		vi.spyOn(console, 'info').mockImplementation(() => {});
		client.POST.mockResolvedValue({});
		await collectGarbage();
		expect(client.POST).toHaveBeenCalledWith('/subscribers/query/delete', {
			body: {
				query:
					"subscribers.status != 'blocklisted' AND NOT EXISTS (SELECT 1 FROM subscriber_lists sl WHERE sl.subscriber_id = subscribers.id)"
			}
		});
		expect(console.info).toHaveBeenCalledWith('  - Deleted subscribers without lists');
	});

	test('reports a failed deletion', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		client.POST.mockResolvedValue({ error: 'timeout' });
		await collectGarbage();
		expect(console.error).toHaveBeenCalledWith(
			'  ! Failed to delete subscribers without lists: timeout'
		);
	});
});
