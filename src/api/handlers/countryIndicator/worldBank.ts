import { z } from 'zod';
import { logger } from '#lib/logger';

/** How long a figure may take before the request counts as failed; the API sometimes never answers. */
export const WB_TIMEOUT_MS = 8_000;

/** A figure as the World Bank has it: its most recent value and the year it is for. */
export type WorldBankFigure = { value: number | null; year: number | null };

/**
 * The most recent figure of `indicator` for `country` (alpha-3) from the World Bank's open API,
 * looking back ten years. `{ value: null }` when the API answered without one (no data, unknown
 * country); `undefined` when it did not answer usably (timeout, network, HTTP error), so the
 * cache keeps what it had.
 */
export async function fetchWorldBankFigure({
	country,
	indicator
}: {
	country: string;
	indicator: string;
}): Promise<WorldBankFigure | undefined> {
	const url = `https://api.worldbank.org/v2/country/${encodeURIComponent(country)}/indicator/${encodeURIComponent(indicator)}?format=json&per_page=10`;
	try {
		// A timer of our own rather than `AbortSignal.timeout`, so tests can move it with fake timers
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), WB_TIMEOUT_MS);
		const response = await fetch(url, { signal: controller.signal }).finally(() =>
			clearTimeout(timer)
		);
		if (!response.ok) {
			logger.warn('The World Bank API refused a figure', {
				country,
				indicator,
				status: response.status
			});
			return undefined;
		}
		return extractFigure(await response.json());
	} catch (error) {
		logger.warn('Fetching a figure from the World Bank failed', { country, indicator, error });
		return undefined;
	}
}

/** An entry of the data page; anything that is not one carrying a number counts as no value. */
const indicatorEntry = z
	.object({ value: z.number(), date: z.coerce.number().int().nullable().catch(null) })
	.nullable()
	.catch(null);

/** The API answers `[paging, entries]`, the most recent entry first. */
const indicatorResponse = z.tuple([z.unknown(), z.array(indicatorEntry)], z.unknown());

function extractFigure(data: unknown): WorldBankFigure {
	const parsed = indicatorResponse.safeParse(data);
	if (!parsed.success) return { value: null, year: null };
	const [, entries] = parsed.data;
	const entry = entries.find((candidate) => candidate !== null);
	return entry ? { value: entry.value, year: entry.date } : { value: null, year: null };
}
