import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { logger } from '#lib/logger';

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
vi.mock('../db', () => ({
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
	const lists = { idOf: new Map([['global:DMUN_NEWSLETTER', 1]]), ids: new Set([1]) };
	const subscribers = new Map([['a@example.org', { id: 1 }]]);

	beforeEach(() => {
		vi.spyOn(logger, 'info').mockImplementation(() => {});
		vi.spyOn(logger, 'error').mockImplementation(() => {});
		mocks.config.LISTMONK_API_URL = 'http://listmonk';
		mocks.findConferences.mockResolvedValue(conferences);
		mocks.ensureListsExist.mockResolvedValue(lists);
		mocks.fetchSubscriberMap.mockResolvedValue(subscribers);
		mocks.processUsersInBatches.mockImplementation(async ({ callback }) => {
			await callback([{ id: 'u1' }]);
			return 1;
		});
		mocks.planUserBatch.mockImplementation(({ plan }) => {
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
		expect(mocks.fetchSubscriberMap).toHaveBeenCalledWith([1]);
		const [[{ cutoff }]] = mocks.processUsersInBatches.mock.calls;
		expect(cutoff).toBeInstanceOf(Date);
		expect(mocks.planUserBatch).toHaveBeenCalledWith({
			users: [{ id: 'u1' }],
			subscriberMap: subscribers,
			lists,
			plan: {
				userActions: [{ kind: 'create' }, { kind: 'update' }],
				releases: [],
				upToDate: 0,
				skippedNoLists: 0
			},
			cutoff
		});
		expect(mocks.planReleases).toHaveBeenCalledWith({
			subscriberMap: subscribers,
			lists,
			plan: expect.anything()
		});
		expect(logger.info).toHaveBeenCalledWith(
			'Plan summary',
			expect.objectContaining({ toCreate: 1, toUpdate: 1 })
		);
		expect(mocks.executeActions).toHaveBeenCalledWith({
			label: 'user changes',
			actions: [{ kind: 'create' }, { kind: 'update' }]
		});
		expect(mocks.executeActions).toHaveBeenCalledWith({ label: 'releases', actions: [] });
		expect(mocks.collectGarbage).toHaveBeenCalledOnce();
		expect(mocks.logTaskEnd).toHaveBeenCalledWith({ taskName: TASK, startTime: 1 });
	});

	test('aborts without a Listmonk URL', async () => {
		mocks.config.LISTMONK_API_URL = '';
		await runMailSync();
		expect(mocks.taskError).toHaveBeenCalledWith({
			taskName: TASK,
			message: 'Listmonk API URL is not set. Aborting task.'
		});
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
		expect(mocks.taskError).toHaveBeenCalledWith({
			taskName: TASK,
			message: 'Could not fetch all subscribers from Listmonk. Aborting task.'
		});
		expect(mocks.processUsersInBatches).not.toHaveBeenCalled();
	});

	test('logs a failure instead of throwing, and still ends the task', async () => {
		const error = new Error('database gone');
		mocks.findConferences.mockRejectedValue(error);
		await expect(runMailSync()).resolves.toBeUndefined();
		expect(mocks.taskError).toHaveBeenCalledWith({
			taskName: TASK,
			message: 'Task failed.',
			error
		});
		expect(mocks.logTaskEnd).toHaveBeenCalledWith({ taskName: TASK, startTime: 1 });
	});
});
