import { beforeEach, describe, expect, test, vi } from 'vitest';

const get = vi.fn();
vi.mock('../../tasks/apis/listmonk/listmonkClient', () => ({ listmonkClient: { GET: get } }));
// Complete, because Bun's test runner shares module mocks between test files.
vi.mock('../../tasks/logs', () => ({
	logLoading: vi.fn(),
	logTaskStart: vi.fn(),
	logTaskEnd: vi.fn(),
	taskWarning: vi.fn(),
	taskError: vi.fn(),
	slackNotification: vi.fn()
}));

const { fetchSubscriberMap } = await import('../../tasks/mailSync/subscriberFetcher');

describe('fetchSubscriberMap', () => {
	beforeEach(() => get.mockReset());

	test('asks only for subscribers on our lists, in one request', async () => {
		get.mockResolvedValue({
			data: { data: { results: [{ id: 1, email: ' Erika@Example.org ', lists: [] }], total: 1 } }
		});

		const map = await fetchSubscriberMap([3, 5]);

		expect(get).toHaveBeenCalledTimes(1);
		expect(get).toHaveBeenCalledWith('/subscribers', {
			params: { query: { list_id: [3, 5], per_page: 'all' } }
		});
		expect([...map!.keys()]).toEqual(['erika@example.org']);
	});

	test('does not ask Listmonk at all without lists', async () => {
		expect((await fetchSubscriberMap([]))?.size).toBe(0);
		expect(get).not.toHaveBeenCalled();
	});

	test('returns undefined when the request fails', async () => {
		get.mockResolvedValue({ error: 'boom' });
		expect(await fetchSubscriberMap([3])).toBeUndefined();
	});
});
