import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ GET: vi.fn(), taskWarning: vi.fn() }));

vi.mock('../apis/listmonk/listmonkClient', () => ({ listmonkClient: { GET: mocks.GET } }));
vi.mock('../logs', () => ({ taskWarning: mocks.taskWarning }));

const { fetchSubscriberMap } = await import('./subscriberFetcher');

const subscriber = (id: number, email: string) => ({ id, email, name: `S${id}`, lists: [] });

/** One page of 40 subscribers, numbered from `first`. */
const page = (first: number, count: number, total: number) => ({
	data: {
		data: {
			total,
			results: Array.from({ length: count }, (_, i) =>
				subscriber(first + i, ` User${first + i}@Example.org `)
			)
		}
	}
});

describe('fetchSubscriberMap', () => {
	beforeEach(() => {
		vi.spyOn(console, 'info').mockImplementation(() => {});
	});

	afterEach(() => {
		vi.restoreAllMocks();
		vi.resetAllMocks();
	});

	test('reads every page, keyed by normalized address', async () => {
		mocks.GET.mockResolvedValueOnce(page(1, 40, 45)).mockResolvedValueOnce(page(41, 5, 45));

		const map = await fetchSubscriberMap();

		expect(map?.size).toBe(45);
		expect(map?.get('user41@example.org')?.id).toBe(41);
		expect(mocks.GET).toHaveBeenCalledTimes(2);
		expect(mocks.GET).toHaveBeenLastCalledWith('/subscribers', {
			params: { query: { per_page: 40, page: 2 } }
		});
	});

	test('stops after a single page that holds everything', async () => {
		mocks.GET.mockResolvedValueOnce(page(1, 40, 40));
		expect((await fetchSubscriberMap())?.size).toBe(40);
		expect(mocks.GET).toHaveBeenCalledOnce();
	});

	test('returns an empty map when Listmonk has no subscribers', async () => {
		mocks.GET.mockResolvedValueOnce({ data: { data: { results: [] } } });
		expect(await fetchSubscriberMap()).toEqual(new Map());
	});

	test.each([
		['an error', { error: 'down' }],
		['no data', { data: {} }],
		['no results', { data: { data: { total: 3 } } }]
	])('gives up when a page returns %s', async (_label, response) => {
		mocks.GET.mockResolvedValueOnce(page(1, 40, 80)).mockResolvedValueOnce(response);
		expect(await fetchSubscriberMap()).toBeUndefined();
		expect(mocks.taskWarning).toHaveBeenCalledWith(
			'Mail Service: Sync with Listmonk',
			'Failed to fetch subscribers from Listmonk'
		);
	});
});
