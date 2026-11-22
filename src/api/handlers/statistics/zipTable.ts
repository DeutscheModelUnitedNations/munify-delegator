import worldCountries from 'world-countries';
import { alpha2ToAlpha3 } from '#lib/helpers/countryCodes';

/**
 * The table behind the statistics map: the centre of every ZIP area (country + first three
 * characters, as `statistics_addresses` groups) built from GeoNames' postal codes by
 * `scripts/buildZipCoordinates.ts` into `zipCoordinates.tsv`. Pure functions, so the script and
 * the app share them. Only countries `hasZipAreas` names are in it.
 */

export interface Coordinates {
	lat: number;
	lng: number;
}

/** ISO alpha-3 for alpha-2 or alpha-3 input: the user table holds alpha-3, older rows alpha-2. */
export function normalizeCountry(country: string) {
	const code = country.trim().toUpperCase();
	return code.length === 2 ? (alpha2ToAlpha3(code) ?? code) : code;
}

/** The lookup key of a ZIP (or ZIP prefix): `left(zip, 3)` as in the view, trimmed, upper case. */
export function zipKey({ country, zip }: { country: string; zip: string }) {
	return `${normalizeCountry(country)}\t${zip.slice(0, 3).trim().toUpperCase()}`;
}

// Where participants come from: the table keeps ZIP areas of these regions only (Europe, Turkey,
// the Middle East, Northern Africa). People elsewhere land on their country's centre.
const MAPPED_SUBREGIONS = new Set(['Western Asia', 'Northern Africa']);
const mappedCountries = new Set(
	worldCountries
		.filter((c) => c.region === 'Europe' || MAPPED_SUBREGIONS.has(c.subregion))
		.map((c) => c.cca3)
);

/** Whether the table holds ZIP areas of a country (alpha-2 or alpha-3). */
export function hasZipAreas(country: string) {
	return mappedCountries.has(normalizeCountry(country));
}

/** One TSV line per area (`country`, `prefix`, `lat`, `lng`), sorted so rebuilds diff cleanly. */
export function buildZipTable(
	postalCodes: Iterable<{ country: string; zip: string } & Coordinates>
) {
	const sums = new Map<string, Coordinates & { n: number }>();
	for (const code of postalCodes) {
		if (!hasZipAreas(code.country)) continue;
		const key = zipKey(code);
		if (key.endsWith('\t')) continue;
		const sum = sums.get(key) ?? { lat: 0, lng: 0, n: 0 };
		sum.lat += code.lat;
		sum.lng += code.lng;
		sum.n += 1;
		sums.set(key, sum);
	}
	return [...sums]
		.map(([key, { lat, lng, n }]) => `${key}\t${(lat / n).toFixed(3)}\t${(lng / n).toFixed(3)}`)
		.sort()
		.join('\n');
}

export function parseZipTable(tsv: string) {
	const table = new Map<string, Coordinates>();
	for (const line of tsv.split('\n')) {
		const [country, prefix, lat, lng] = line.split('\t');
		if (!country || !prefix || !lat || !lng) continue;
		table.set(`${country}\t${prefix}`, { lat: Number(lat), lng: Number(lng) });
	}
	return table;
}
