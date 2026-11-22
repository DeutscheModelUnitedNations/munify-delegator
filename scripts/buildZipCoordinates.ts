/**
 * Rebuilds `src/api/handlers/statistics/zipCoordinates.tsv`, the centre of every ZIP area the
 * statistics map shows, from GeoNames' postal codes of all countries
 * (https://download.geonames.org/export/zip/, CC BY 4.0 — the map credits GeoNames).
 *
 *   bun scripts/buildZipCoordinates.ts
 */
import { writeFile } from 'node:fs/promises';
import { unzipSync, strFromU8 } from 'fflate';
import { buildZipTable } from '../src/api/handlers/statistics/zipTable';

const SOURCE = 'https://download.geonames.org/export/zip/allCountries.zip';
const TARGET = new URL('../src/api/handlers/statistics/zipCoordinates.tsv', import.meta.url);

const response = await fetch(SOURCE);
if (!response.ok) throw new Error(`Downloading ${SOURCE} failed: ${response.status}`);
const files = unzipSync(new Uint8Array(await response.arrayBuffer()), {
	filter: (file) => file.name === 'allCountries.txt'
});
const text = files['allCountries.txt'];
if (!text) throw new Error('allCountries.txt missing from the archive');

// Columns: country code, postal code, place, 3 × (admin name, admin code), latitude, longitude, accuracy
function* postalCodes() {
	for (const line of strFromU8(text).split('\n')) {
		const columns = line.split('\t');
		const [country, zip, lat, lng] = [columns[0], columns[1], columns[9], columns[10]];
		if (!country || !zip || !lat || !lng) continue;
		yield { country, zip, lat: Number(lat), lng: Number(lng) };
	}
}

const table = buildZipTable(postalCodes());
await writeFile(TARGET, `${table}\n`);
console.log(`Wrote ${table.split('\n').length} ZIP areas to ${TARGET.pathname}`);
