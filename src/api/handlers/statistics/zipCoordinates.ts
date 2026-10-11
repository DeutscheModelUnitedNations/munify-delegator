import { parse } from 'csv-parse/sync';

// This is hard coded for now
// TODO If we expand to other countries than Germany this should be outsourced into an env variable.
const CSV_URL =
	'https://raw.githubusercontent.com/WZBSocialScienceCenter/plz_geocoord/refs/heads/master/plz_geocoord.csv';

interface Coordinates {
	lat: number;
	lng: number;
}

/** Every German ZIP, plus the centre of each three-digit prefix the statistics group by. */
async function download() {
	const res = await fetch(CSV_URL);
	if (!res.ok) {
		throw new Error(`Failed to download ZIP CSV: ${res.status} ${res.statusText}`);
	}
	const records: { zip: string; lat: string; lng: string }[] = parse(await res.text(), {
		columns: ['zip', 'lat', 'lng'],
		skip_empty_lines: true
	});

	const coordinates = new Map<string, Coordinates>();
	const prefixSums = new Map<string, Coordinates & { n: number }>();
	for (const { zip, lat, lng } of records) {
		if (!zip || !lat || !lng) continue;
		const point = { lat: parseFloat(lat), lng: parseFloat(lng) };
		coordinates.set(zip.trim(), point);

		const prefix = zip.trim().slice(0, 3);
		const sum = prefixSums.get(prefix) ?? { lat: 0, lng: 0, n: 0 };
		sum.lat += point.lat;
		sum.lng += point.lng;
		sum.n += 1;
		prefixSums.set(prefix, sum);
	}
	for (const [prefix, { lat, lng, n }] of prefixSums) {
		if (!coordinates.has(prefix)) coordinates.set(prefix, { lat: lat / n, lng: lng / n });
	}
	return coordinates;
}

let loading: Promise<Map<string, Coordinates>> | undefined;

/**
 * The ZIP table, downloaded on first use and then kept in memory (about a megabyte). Concurrent
 * callers share one download; a failed one is not remembered, so the next call retries.
 */
export function zipCoordinates() {
	loading ??= download().catch((err) => {
		loading = undefined;
		throw new Error('Unable to load geographic data.', { cause: err });
	});
	return loading;
}
