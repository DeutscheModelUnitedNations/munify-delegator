import worldCountries from 'world-countries';
import tsv from './zipCoordinates.tsv?raw';
import { normalizeCountry, parseZipTable, zipKey } from './zipTable';

let table: ReturnType<typeof parseZipTable> | undefined;
const countryCentres = new Map(
	worldCountries.map((c) => [c.cca3, { lat: c.latlng[0], lng: c.latlng[1] }])
);

/**
 * Where to draw people of a country and ZIP area: the area's centre from GeoNames' postal codes
 * (CC BY 4.0, rebuilt with `bun scripts/buildZipCoordinates.ts`), else — no ZIP, or one GeoNames
 * does not know — the centre of the country (`atCountryCentre`); `undefined` for no known country.
 */
export function zipCoordinates({
	country,
	zipPrefix
}: {
	country: string;
	zipPrefix: string | null;
}) {
	table ??= parseZipTable(tsv);
	const area = zipPrefix === null ? undefined : table.get(zipKey({ country, zip: zipPrefix }));
	if (area) return { ...area, atCountryCentre: false };
	const centre = countryCentres.get(normalizeCountry(country));
	return centre && { ...centre, atCountryCentre: true };
}
