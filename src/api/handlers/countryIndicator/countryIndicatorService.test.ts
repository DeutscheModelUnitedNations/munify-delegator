import { describe, expect, test, vi } from 'vitest';
import { logger } from '#lib/logger';
import { COUNTRY_INDICATOR_CODES } from '#lib/countryStats/indicators';
import {
	countryFigures,
	countryIndicatorsArgsSchema,
	createFigureCache,
	memoryStore,
	type FigureStore
} from './countryIndicatorService';
import type { WorldBankFigure } from './worldBank';

vi.mock('$app/env/private', () => ({ REDIS_URL: undefined }));

const DAY = 24 * 60 * 60 * 1000;
const kenyaPopulation = { country: 'KEN', indicator: 'SP.POP.TOTL' };

/** A cache over memory with a clock the test moves and a World Bank it scripts. */
function setup({ store = memoryStore() }: { store?: FigureStore } = {}) {
	let time = 0;
	const answers: (WorldBankFigure | undefined)[] = [];
	const fetchFigure = vi.fn(async () => answers.shift());
	const cache = createFigureCache({ store, fetchFigure, now: () => time });
	return {
		cache,
		fetchFigure,
		answer: (...next: (WorldBankFigure | undefined)[]) => answers.push(...next),
		advance: (ms: number) => {
			time += ms;
		}
	};
}

describe('createFigureCache', () => {
	test('fetches a figure once and serves it from the cache for a week', async () => {
		const { cache, fetchFigure, answer, advance } = setup();
		answer({ value: 55, year: 2023 });
		expect(await cache.figure(kenyaPopulation)).toEqual({ value: 55, year: 2023 });
		advance(6 * DAY);
		expect(await cache.figure(kenyaPopulation)).toEqual({ value: 55, year: 2023 });
		expect(fetchFigure).toHaveBeenCalledOnce();
		expect(fetchFigure).toHaveBeenCalledWith(kenyaPopulation);
	});

	test('fetches again after a week', async () => {
		const { cache, fetchFigure, answer, advance } = setup();
		answer({ value: 55, year: 2023 }, { value: 56, year: 2024 });
		await cache.figure(kenyaPopulation);
		advance(7 * DAY + 1);
		expect(await cache.figure(kenyaPopulation)).toEqual({ value: 56, year: 2024 });
		expect(fetchFigure).toHaveBeenCalledTimes(2);
	});

	test('caches that the World Bank has no figure, too', async () => {
		const { cache, fetchFigure, answer } = setup();
		answer({ value: null, year: null });
		await cache.figure(kenyaPopulation);
		expect(await cache.figure(kenyaPopulation)).toEqual({ value: null, year: null });
		expect(fetchFigure).toHaveBeenCalledOnce();
	});

	test('serves the stale figure while the World Bank fails, asking again after 15 minutes', async () => {
		const { cache, fetchFigure, answer, advance } = setup();
		answer({ value: 55, year: 2023 }, undefined, { value: 57, year: 2025 });
		await cache.figure(kenyaPopulation);
		advance(8 * DAY);
		expect(await cache.figure(kenyaPopulation)).toEqual({ value: 55, year: 2023 });
		advance(10 * 60 * 1000);
		expect(await cache.figure(kenyaPopulation)).toEqual({ value: 55, year: 2023 });
		expect(fetchFigure).toHaveBeenCalledTimes(2);
		advance(6 * 60 * 1000);
		expect(await cache.figure(kenyaPopulation)).toEqual({ value: 57, year: 2025 });
	});

	test('answers no value when the first fetch fails, without asking again at once', async () => {
		const { cache, fetchFigure, answer } = setup();
		answer(undefined);
		expect(await cache.figure(kenyaPopulation)).toEqual({ value: null, year: null });
		expect(await cache.figure(kenyaPopulation)).toEqual({ value: null, year: null });
		expect(fetchFigure).toHaveBeenCalledOnce();
	});

	test('sends one request for a figure asked for twice at once', async () => {
		const { cache, fetchFigure, answer } = setup();
		answer({ value: 1, year: 2020 });
		const [first, second] = await Promise.all([
			cache.figure(kenyaPopulation),
			cache.figure(kenyaPopulation)
		]);
		expect(first).toEqual(second);
		expect(fetchFigure).toHaveBeenCalledOnce();
	});

	test('keeps figures of countries and indicators apart', async () => {
		const { cache, answer } = setup();
		answer({ value: 1, year: 2020 }, { value: 2, year: 2021 });
		await cache.figure(kenyaPopulation);
		expect(await cache.figure({ country: 'KEN', indicator: 'NY.GDP.MKTP.CD' })).toEqual({
			value: 2,
			year: 2021
		});
	});

	test('still answers when the store fails', async () => {
		vi.spyOn(logger, 'warn').mockImplementation(() => {});
		const failing: FigureStore = {
			get: async () => {
				throw new Error('redis down');
			},
			set: async () => {
				throw new Error('redis down');
			}
		};
		const { cache, answer } = setup({ store: failing });
		answer({ value: 3, year: 2022 });
		expect(await cache.figure(kenyaPopulation)).toEqual({ value: 3, year: 2022 });
		expect(logger.warn).toHaveBeenCalledWith('Reading a cached World Bank figure failed', {
			key: expect.any(String),
			error: expect.any(Error)
		});
		vi.restoreAllMocks();
	});

	test('treats an unreadable entry as none', async () => {
		const store = memoryStore();
		await store.set('world-bank:v1:KEN:SP.POP.TOTL', '{"value":"x"}');
		const { cache, fetchFigure, answer } = setup({ store });
		answer({ value: 4, year: 2024 });
		expect(await cache.figure(kenyaPopulation)).toEqual({ value: 4, year: 2024 });
		expect(fetchFigure).toHaveBeenCalledOnce();
	});
});

describe('countryFigures', () => {
	test('answers every indicator of the country information, in order', async () => {
		const figure = vi.fn(async ({ indicator }: { indicator: string }) => ({
			value: indicator.length,
			year: 2024
		}));
		const figures = await countryFigures({ alpha3Code: 'KEN', cache: { figure } });
		expect(figures.map(({ indicator }) => indicator)).toEqual(COUNTRY_INDICATOR_CODES);
		expect(figure).toHaveBeenCalledWith({ country: 'KEN', indicator: 'SP.POP.TOTL' });
	});
});

describe('countryIndicatorsArgsSchema', () => {
	test('takes a known code in any case', () => {
		expect(countryIndicatorsArgsSchema.parse({ alpha3Code: 'ken' })).toEqual({
			alpha3Code: 'KEN'
		});
	});

	test.each(['XXX', 'DE', '', 'KEN;DROP'])('refuses %j', (alpha3Code) => {
		expect(countryIndicatorsArgsSchema.safeParse({ alpha3Code }).success).toBe(false);
	});
});
