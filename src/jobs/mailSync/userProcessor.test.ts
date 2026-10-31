import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { logger } from '#lib/logger';

const findMailSyncUsers = vi.hoisted(() => vi.fn());

vi.mock('../config', () => ({ config: { MAIL_SYNC_BATCH_SIZE: 2 } }));
vi.mock('./mailSyncUsers', () => ({ findMailSyncUsers }));

const { processUsersInBatches } = await import('./userProcessor');

const users = (...ids: string[]) => ids.map((id) => ({ id }));
const CUTOFF = new Date('2026-01-01T00:00:00Z');

describe('processUsersInBatches', () => {
	beforeEach(() => {
		vi.spyOn(logger, 'info').mockImplementation(() => {});
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

		const total = await processUsersInBatches({
			cutoff: CUTOFF,
			callback: async (batch) => {
				seen.push(batch.map((user) => user.id));
			}
		});

		expect(total).toBe(5);
		expect(seen).toEqual([['a', 'b'], ['c', 'd'], ['e']]);

		const [first, second] = findMailSyncUsers.mock.calls.map(([args]) => args);
		expect(first.limit).toBe(2);
		expect(first.where.OR).toHaveLength(6);
		expect(second.where.AND).toEqual([first.where, { id: { gt: 'b' } }]);
	});

	test('stops at an empty page', async () => {
		findMailSyncUsers.mockResolvedValueOnce(users('a', 'b')).mockResolvedValueOnce([]);
		const callback = vi.fn();

		expect(await processUsersInBatches({ cutoff: CUTOFF, callback, batchSize: 2 })).toBe(2);
		expect(callback).toHaveBeenCalledOnce();
	});

	test('processes nobody when there are no users', async () => {
		findMailSyncUsers.mockResolvedValueOnce([]);
		expect(await processUsersInBatches({ cutoff: CUTOFF, callback: vi.fn(), batchSize: 10 })).toBe(
			0
		);
	});

	test('loads opted-in users and participants of conferences that ended after the cutoff', async () => {
		findMailSyncUsers.mockResolvedValueOnce([]);
		await processUsersInBatches({ cutoff: CUTOFF, callback: vi.fn(), batchSize: 10 });

		const [{ where }] = findMailSyncUsers.mock.calls[0];
		expect(where.OR).toContainEqual({ wantsToReceiveGeneralInformation: true });
		expect(where.OR).toContainEqual({
			delegationMemberships: { conference: { endConference: { gte: CUTOFF } } }
		});
	});
});
