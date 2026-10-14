import { afterEach, describe, expect, test, vi } from 'vitest';
import fetchWBStat from './fetchWBStat';

/** Answers every fetch with `body` as JSON, or with the given failing status. */
function respondWith(body: unknown, status = 200) {
	const fetchMock = vi.fn(async () => new Response(JSON.stringify(body), { status }));
	vi.stubGlobal('fetch', fetchMock);
	return fetchMock;
}

describe('fetchWBStat', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	test('asks the World Bank for the indicator of the country', async () => {
		const fetchMock = respondWith([{}, [{ value: 1 }]]);
		await fetchWBStat('DEU', 'SP.POP.TOTL');
		expect(fetchMock).toHaveBeenCalledWith(
			'https://api.worldbank.org/v2/country/DEU/indicator/SP.POP.TOTL?format=json&per_page=10'
		);
	});

	test('returns the most recent value that is not null', async () => {
		respondWith([
			{},
			[null, 'x', { year: 2024 }, { value: null }, { value: 83_000_000 }, { value: 1 }]
		]);
		expect(await fetchWBStat('DEU', 'SP.POP.TOTL')).toBe(83_000_000);
	});

	test('returns null when no entry has a value', async () => {
		respondWith([{}, [{ value: null }]]);
		expect(await fetchWBStat('DEU', 'SP.POP.TOTL')).toBeNull();
	});

	test.each([
		['not an array', { message: 'Invalid value' }],
		['only the paging header', [{ page: 1 }]],
		['no data array', [{ page: 1 }, null]]
	])('returns null for a response that is %s', async (_label, body) => {
		respondWith(body);
		expect(await fetchWBStat('XXX', 'SP.POP.TOTL')).toBeNull();
	});

	test('returns null when the API answers with an error status', async () => {
		vi.spyOn(console, 'warn').mockImplementation(() => {});
		respondWith({}, 502);
		expect(await fetchWBStat('DEU', 'SP.POP.TOTL')).toBeNull();
		expect(console.warn).toHaveBeenCalledWith('World Bank API returned 502 for DEU/SP.POP.TOTL');
	});

	test('returns null when the request fails', async () => {
		vi.spyOn(console, 'warn').mockImplementation(() => {});
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => {
				throw new TypeError('network down');
			})
		);
		expect(await fetchWBStat('DEU', 'SP.POP.TOTL')).toBeNull();
	});
});
