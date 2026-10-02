import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const findMailSyncUsers = vi.hoisted(() => vi.fn());

vi.mock('../config', () => ({ config: { MAIL_SYNC_BATCH_SIZE: 2 } }));
vi.mock('./types', () => ({ findMailSyncUsers }));

const { processUsersInBatches } = await import('./userProcessor');

const users = (...ids: string[]) => ids.map((id) => ({ id }));

describe('processUsersInBatches', () => {
	beforeEach(() => {
		vi.spyOn(console, 'info').mockImplementation(() => {});
	});

	afterEach(() => {
		vi.restoreAllMocks();
		findMailSyncUsers.mockReset();
	});

	test('pages through the users with an id cursor until a short page', async () => {
		findMailSyncUsers
			.mockResolvedValueOnce(users('a', 'b'))
			.mockResolvedValueOnce(users('c', 'd'))
			.mockResolvedValueOnce(users('e'));
		const seen: string[][] = [];

		const total = await processUsersInBatches(async (batch) => {
			seen.push(batch.map((user) => user.id));
		});

		expect(total).toBe(5);
		expect(seen).toEqual([['a', 'b'], ['c', 'd'], ['e']]);

		const [first, second] = findMailSyncUsers.mock.calls.map(([args]) => args);
		expect(first.limit).toBe(2);
		expect(first.where.OR).toHaveLength(4);
		expect(second.where.AND).toEqual([first.where, { id: { gt: 'b' } }]);
	});

	test('stops at an empty page', async () => {
		findMailSyncUsers.mockResolvedValueOnce(users('a', 'b')).mockResolvedValueOnce([]);
		const callback = vi.fn();

		expect(await processUsersInBatches(callback, 2)).toBe(2);
		expect(callback).toHaveBeenCalledOnce();
	});

	test('processes nobody when there are no users', async () => {
		findMailSyncUsers.mockResolvedValueOnce([]);
		expect(await processUsersInBatches(vi.fn(), 10)).toBe(0);
	});

	test('only considers users of conferences ending within ten months', async () => {
		findMailSyncUsers.mockResolvedValueOnce([]);
		vi.useFakeTimers({ now: new Date(2026, 0, 15) });
		await processUsersInBatches(vi.fn(), 10);
		vi.useRealTimers();

		const [{ where }] = findMailSyncUsers.mock.calls[0];
		expect(where.OR[0]).toEqual({
			delegationMemberships: { conference: { endConference: { lt: new Date(2026, 10, 15) } } }
		});
	});
});
