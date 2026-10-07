import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
	config: { LISTMONK_API_URL: 'http://listmonk' },
	findConferences: vi.fn(),
	taskError: vi.fn(),
	logTaskEnd: vi.fn(),
	ensureListsExist: vi.fn(),
	fetchSubscriberMap: vi.fn(),
	processUsersInBatches: vi.fn(),
	planUserBatch: vi.fn(),
	planReleases: vi.fn(),
	executeActions: vi.fn(),
	collectGarbage: vi.fn()
}));

vi.mock('../config', () => ({ config: mocks.config }));
vi.mock('$api/db/db', () => ({
	db: { query: { conference: { findMany: mocks.findConferences } } }
}));
vi.mock('../logs', () => ({
	logTaskStart: () => 1,
	logTaskEnd: mocks.logTaskEnd,
	taskError: mocks.taskError
}));
vi.mock('./listManager', () => ({ ensureListsExist: mocks.ensureListsExist }));
vi.mock('./subscriberFetcher', () => ({ fetchSubscriberMap: mocks.fetchSubscriberMap }));
vi.mock('./userProcessor', () => ({ processUsersInBatches: mocks.processUsersInBatches }));
vi.mock('./subscriberDiff', () => ({
	planUserBatch: mocks.planUserBatch,
	planReleases: mocks.planReleases
}));
vi.mock('./subscriberActions', () => ({
	executeActions: mocks.executeActions,
	collectGarbage: mocks.collectGarbage
}));

const { runMailSync } = await import('./orchestrator');

const TASK = 'Mail Service: Sync with Listmonk';

describe('runMailSync', () => {
	const conferences = [{ id: 'c1', title: 'MUN-SH' }];
	const listIds = new Map([['[global] DMUN_NEWSLETTER', 1]]);
	const subscribers = new Map([['a@example.org', { id: 1 }]]);

	beforeEach(() => {
		vi.spyOn(console, 'info').mockImplementation(() => {});
		vi.spyOn(console, 'error').mockImplementation(() => {});
		mocks.config.LISTMONK_API_URL = 'http://listmonk';
		mocks.findConferences.mockResolvedValue(conferences);
		mocks.ensureListsExist.mockResolvedValue(listIds);
		mocks.fetchSubscriberMap.mockResolvedValue(subscribers);
		mocks.processUsersInBatches.mockImplementation(async (callback) => {
			await callback([{ id: 'u1' }]);
			return 1;
		});
		mocks.planUserBatch.mockImplementation((_batch, _map, _ids, plan) => {
			plan.userActions.push({ kind: 'create' }, { kind: 'update' });
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
		vi.resetAllMocks();
	});

	test('plans against every user and subscriber, then executes the plan', async () => {
		await runMailSync();

		expect(mocks.ensureListsExist).toHaveBeenCalledWith(conferences);
		expect(mocks.planUserBatch).toHaveBeenCalledWith([{ id: 'u1' }], subscribers, listIds, {
			userActions: [{ kind: 'create' }, { kind: 'update' }],
			releases: [],
			upToDate: 0,
			skippedNoLists: 0
		});
		expect(mocks.planReleases).toHaveBeenCalledWith(subscribers, expect.anything());
		expect(console.info).toHaveBeenCalledWith('  To create:            1');
		expect(console.info).toHaveBeenCalledWith('  To update:            1');
		expect(mocks.executeActions).toHaveBeenCalledWith('user changes', [
			{ kind: 'create' },
			{ kind: 'update' }
		]);
		expect(mocks.executeActions).toHaveBeenCalledWith('releases', []);
		expect(mocks.collectGarbage).toHaveBeenCalledOnce();
		expect(mocks.logTaskEnd).toHaveBeenCalledWith(TASK, 1);
	});

	test('aborts without a Listmonk URL', async () => {
		mocks.config.LISTMONK_API_URL = '';
		await runMailSync();
		expect(mocks.taskError).toHaveBeenCalledWith(
			TASK,
			'Listmonk API URL is not set. Aborting task.'
		);
		expect(mocks.ensureListsExist).not.toHaveBeenCalled();
		expect(mocks.logTaskEnd).toHaveBeenCalled();
	});

	test('stops when the lists could not be prepared', async () => {
		mocks.ensureListsExist.mockResolvedValue(undefined);
		await runMailSync();
		expect(mocks.fetchSubscriberMap).not.toHaveBeenCalled();
	});

	test('aborts when the subscribers could not all be fetched', async () => {
		mocks.fetchSubscriberMap.mockResolvedValue(undefined);
		await runMailSync();
		expect(mocks.taskError).toHaveBeenCalledWith(
			TASK,
			'Could not fetch all subscribers from Listmonk. Aborting task.'
		);
		expect(mocks.processUsersInBatches).not.toHaveBeenCalled();
	});

	test('logs a failure instead of throwing, and still ends the task', async () => {
		const error = new Error('database gone');
		mocks.findConferences.mockRejectedValue(error);
		await expect(runMailSync()).resolves.toBeUndefined();
		expect(console.error).toHaveBeenCalledWith(`Task "${TASK}" failed:`, error);
		expect(mocks.logTaskEnd).toHaveBeenCalledWith(TASK, 1);
	});
});
