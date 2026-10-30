import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ GET: vi.fn(), taskWarning: vi.fn() }));

vi.mock('../apis/listmonk/listmonkClient', () => ({ listmonkClient: { GET: mocks.GET } }));
vi.mock('../logs', () => ({ taskWarning: mocks.taskWarning }));

const { fetchSubscriberMap } = await import('./subscriberFetcher');

const subscriber = (id: number, email: string) => ({ id, email, name: `S${id}`, lists: [] });

describe('fetchSubscriberMap', () => {
	beforeEach(() => {
		vi.spyOn(console, 'info').mockImplementation(() => {});
	});

	afterEach(() => {
		vi.restoreAllMocks();
		vi.resetAllMocks();
	});

	test('asks only for subscribers on our lists, in one request, keyed by normalized address', async () => {
		mocks.GET.mockResolvedValueOnce({
			data: {
				data: {
					results: [subscriber(1, ' Erika@Example.org '), subscriber(2, 'max@example.org')],
					total: 2
				}
			}
		});

		const map = await fetchSubscriberMap([3, 5]);

		expect(mocks.GET).toHaveBeenCalledOnce();
		expect(mocks.GET).toHaveBeenCalledWith('/subscribers', {
			params: { query: { list_id: [3, 5], per_page: 'all' } }
		});
		expect([...(map?.keys() ?? [])]).toEqual(['erika@example.org', 'max@example.org']);
		expect(map?.get('erika@example.org')?.id).toBe(1);
	});

	test('does not ask Listmonk at all without lists', async () => {
		expect(await fetchSubscriberMap([])).toEqual(new Map());
		expect(mocks.GET).not.toHaveBeenCalled();
	});

	test('returns an empty map when nobody is on our lists', async () => {
		mocks.GET.mockResolvedValueOnce({ data: { data: { results: [] } } });
		expect(await fetchSubscriberMap([3])).toEqual(new Map());
	});

	test.each([
		['an error', { error: 'down' }],
		['no data', { data: {} }],
		['no results', { data: { data: { total: 3 } } }]
	])('gives up when the request returns %s', async (_label, response) => {
		mocks.GET.mockResolvedValueOnce(response);
		expect(await fetchSubscriberMap([3])).toBeUndefined();
		expect(mocks.taskWarning).toHaveBeenCalledWith(
			'Mail Service: Sync with Listmonk',
			'Failed to fetch subscribers from Listmonk'
		);
	});
});
