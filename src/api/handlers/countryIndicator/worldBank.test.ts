import { afterEach, describe, expect, test, vi } from 'vitest';
import { logger } from '#lib/logger';
import { fetchWorldBankFigure, WB_TIMEOUT_MS } from './worldBank';

/** Answers every fetch with `body` as JSON, or with the given failing status. */
function respondWith(body: unknown, status = 200) {
	const fetchMock = vi.fn(async () => new Response(JSON.stringify(body), { status }));
	vi.stubGlobal('fetch', fetchMock);
	return fetchMock;
}

const germanPopulation = { country: 'DEU', indicator: 'SP.POP.TOTL' };

describe('fetchWorldBankFigure', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
		vi.useRealTimers();
	});

	test('asks the World Bank for the indicator of the country', async () => {
		const fetchMock = respondWith([{}, [{ value: 1, date: '2024' }]]);
		await fetchWorldBankFigure(germanPopulation);
		expect(fetchMock).toHaveBeenCalledWith(
			'https://api.worldbank.org/v2/country/DEU/indicator/SP.POP.TOTL?format=json&per_page=10',
			{ signal: expect.any(AbortSignal) }
		);
	});

	test('returns the most recent value that is not null, with its year', async () => {
		respondWith([
			{},
			[
				null,
				'x',
				{ date: '2025' },
				{ value: null },
				{ value: 83_000_000, date: '2023' },
				{ value: 1 }
			]
		]);
		expect(await fetchWorldBankFigure(germanPopulation)).toEqual({
			value: 83_000_000,
			year: 2023
		});
	});

	test('keeps the value of an entry whose year is unreadable', async () => {
		respondWith([{}, [{ value: 5, date: 'n/a' }]]);
		expect(await fetchWorldBankFigure(germanPopulation)).toEqual({ value: 5, year: null });
	});

	test('skips values that are not numbers', async () => {
		respondWith([{}, [{ value: '83000000' }, { value: 1, date: '2020' }]]);
		expect(await fetchWorldBankFigure(germanPopulation)).toEqual({ value: 1, year: 2020 });
	});

	test.each([
		['no entry with a value', [{}, [{ value: null }]]],
		['not an array', { message: 'Invalid value' }],
		['only the paging header', [{ page: 1 }]],
		['no data array', [{ page: 1 }, null]]
	])('answers no value for a response with %s', async (_label, body) => {
		respondWith(body);
		expect(await fetchWorldBankFigure({ country: 'XXX', indicator: 'SP.POP.TOTL' })).toEqual({
			value: null,
			year: null
		});
	});

	test('fails when the API answers with an error status', async () => {
		vi.spyOn(logger, 'warn').mockImplementation(() => {});
		respondWith({}, 502);
		expect(await fetchWorldBankFigure(germanPopulation)).toBeUndefined();
		expect(logger.warn).toHaveBeenCalledWith('The World Bank API refused a figure', {
			...germanPopulation,
			status: 502
		});
	});

	test('fails when the request fails', async () => {
		vi.spyOn(logger, 'warn').mockImplementation(() => {});
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => {
				throw new TypeError('network down');
			})
		);
		expect(await fetchWorldBankFigure(germanPopulation)).toBeUndefined();
	});

	test('gives up on a request the API never answers', async () => {
		vi.useFakeTimers();
		vi.spyOn(logger, 'warn').mockImplementation(() => {});
		vi.stubGlobal(
			'fetch',
			vi.fn(
				(_url: string, { signal }: { signal: AbortSignal }) =>
					new Promise<Response>((_resolve, reject) =>
						signal.addEventListener('abort', () => reject(signal.reason))
					)
			)
		);
		const result = fetchWorldBankFigure({ country: 'ESP', indicator: 'SE.ADT.LITR.ZS' });
		await vi.advanceTimersByTimeAsync(WB_TIMEOUT_MS);
		expect(await result).toBeUndefined();
	});
});
