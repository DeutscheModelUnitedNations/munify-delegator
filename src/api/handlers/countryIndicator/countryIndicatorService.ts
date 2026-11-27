import type { Redis } from 'ioredis';
import { z } from 'zod';
import worldCountries from 'world-countries';
import { m } from '#lib/paraglide/messages';
import { logger } from '#lib/logger';
import { redisClient } from '#api/services/redisClient';
import { COUNTRY_INDICATOR_CODES, type CountryIndicatorCode } from '#lib/countryStats/indicators';
import { fetchWorldBankFigure, type WorldBankFigure } from './worldBank';

/**
 * World Bank figures for the country information, cached so a delegate's dashboard does not wait
 * on (or fail with) the World Bank. Figures change about once a year: a fetched one is served for
 * a week, then fetched again; one the World Bank does not answer for is served as it was (stale)
 * and asked for again after a quarter of an hour, so an outage neither empties the page nor sends
 * every view to the API. The cache is Redis when there is one, shared by every instance, else
 * this process's memory: the figures are public, nobody's data.
 */

const FRESH_MS = 7 * 24 * 60 * 60 * 1000;
const RETRY_MS = 15 * 60 * 1000;
/** How long Redis keeps an entry at all; a stale figure is better than none. */
const KEEP_SECONDS = 180 * 24 * 60 * 60;
const KEY_PREFIX = 'world-bank:v1';

export type CountryFigure = WorldBankFigure & { indicator: CountryIndicatorCode };

/** A cached figure and the moment it should be fetched again. */
type CacheEntry = WorldBankFigure & { refreshAt: number };

const cacheEntry = z.object({
	value: z.number().nullable(),
	year: z.number().int().nullable(),
	refreshAt: z.number()
});

/** Where entries live; `get` answers undefined for none. */
export type FigureStore = {
	get(key: string): Promise<string | undefined>;
	set(key: string, value: string): Promise<void>;
};

export function memoryStore(): FigureStore {
	const entries = new Map<string, string>();
	return {
		get: async (key) => entries.get(key),
		set: async (key, value) => {
			entries.set(key, value);
		}
	};
}

function redisStore(redis: Redis): FigureStore {
	return {
		get: async (key) => (await redis.get(key)) ?? undefined,
		set: async (key, value) => {
			await redis.set(key, value, 'EX', KEEP_SECONDS);
		}
	};
}

export function createFigureCache({
	store,
	fetchFigure,
	now = Date.now
}: {
	store: FigureStore;
	fetchFigure: typeof fetchWorldBankFigure;
	now?: () => number;
}) {
	/** One request per figure at a time, however many dashboards ask for it at once. */
	const inFlight = new Map<string, Promise<WorldBankFigure>>();

	async function read(key: string): Promise<CacheEntry | undefined> {
		try {
			const raw = await store.get(key);
			if (raw === undefined) return undefined;
			const parsed = cacheEntry.safeParse(JSON.parse(raw));
			return parsed.success ? parsed.data : undefined;
		} catch (error) {
			logger.warn('Reading a cached World Bank figure failed', { key, error });
			return undefined;
		}
	}

	async function write(key: string, entry: CacheEntry) {
		try {
			await store.set(key, JSON.stringify(entry));
		} catch (error) {
			logger.warn('Caching a World Bank figure failed', { key, error });
		}
	}

	async function refresh({
		key,
		country,
		indicator,
		cached
	}: {
		key: string;
		country: string;
		indicator: string;
		cached: CacheEntry | undefined;
	}): Promise<WorldBankFigure> {
		const fetched = await fetchFigure({ country, indicator });
		if (fetched) {
			await write(key, { ...fetched, refreshAt: now() + FRESH_MS });
			return fetched;
		}
		const kept = { value: cached?.value ?? null, year: cached?.year ?? null };
		await write(key, { ...kept, refreshAt: now() + RETRY_MS });
		return kept;
	}

	async function figure({
		country,
		indicator
	}: {
		country: string;
		indicator: string;
	}): Promise<WorldBankFigure> {
		const key = `${KEY_PREFIX}:${country}:${indicator}`;
		const cached = await read(key);
		if (cached && cached.refreshAt > now()) return { value: cached.value, year: cached.year };

		const running = inFlight.get(key);
		if (running) return running;
		const request = refresh({ key, country, indicator, cached }).finally(() =>
			inFlight.delete(key)
		);
		inFlight.set(key, request);
		return request;
	}

	return { figure };
}

export type FigureCache = ReturnType<typeof createFigureCache>;

const redis = redisClient({ lazyConnect: true });
const figureCache = createFigureCache({
	store: redis ? redisStore(redis) : memoryStore(),
	fetchFigure: fetchWorldBankFigure
});

const knownAlpha3Codes = new Set(worldCountries.map(({ cca3 }) => cca3));

export const countryIndicatorsArgsSchema = z.looseObject({
	alpha3Code: z
		.string()
		.transform((code) => code.toUpperCase())
		.refine((code) => knownAlpha3Codes.has(code), { error: () => m.unknownCountryCode() })
});

/** Every indicator of the country information for `alpha3Code`, in display order. */
export async function countryFigures({
	alpha3Code,
	cache = figureCache
}: {
	alpha3Code: string;
	cache?: FigureCache;
}): Promise<CountryFigure[]> {
	return Promise.all(
		COUNTRY_INDICATOR_CODES.map(async (indicator) => ({
			indicator,
			...(await cache.figure({ country: alpha3Code, indicator }))
		}))
	);
}
