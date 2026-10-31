import { z } from 'zod';
import { logger } from '#lib/logger';
export default async function fetchWBStat({
	country,
	indicator
}: {
	country: string;
	indicator: string;
}): Promise<number | null> {
	try {
		const url = new URL(
			'https://api.worldbank.org/v2/country/' +
				country +
				'/indicator/' +
				indicator +
				'?format=json&per_page=10'
		);
		url.searchParams.set('format', 'json');

		const response = await fetch(url.toString());
		if (!response.ok) {
			logger.warn(`World Bank API returned ${response.status} for ${country}/${indicator}`);
			return null;
		}

		const data = await response.json();
		return extractValue(data);
	} catch (error) {
		// Network errors, CORS issues, etc.
		logger.warn(`Failed to fetch World Bank data for ${country}/${indicator}`, error);
		return null;
	}
}

/** An entry of the data page; anything that is not one carrying a number counts as no value. */
const indicatorEntry = z.object({ value: z.number() }).nullable().catch(null);

/** The API answers `[paging, entries]`, the most recent entry first. */
const indicatorResponse = z.tuple([z.unknown(), z.array(indicatorEntry)], z.unknown());

function extractValue(data: unknown): number | null {
	const parsed = indicatorResponse.safeParse(data);
	if (!parsed.success) return null;
	const [, entries] = parsed.data;
	return entries.find((entry) => entry !== null)?.value ?? null;
}
