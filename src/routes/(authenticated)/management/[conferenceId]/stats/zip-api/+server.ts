import { parse } from 'csv-parse/sync';
const CSV_URL =
	'https://raw.githubusercontent.com/WZBSocialScienceCenter/plz_geocoord/refs/heads/master/plz_geocoord.csv';

let zipMap: Map<string, { lat: number; lng: number }> | null = null;

async function loadZipMap() {
	if (zipMap) return zipMap; // Cache!
	try {
		const res = await fetch(CSV_URL);
		if (!res.ok) {
			throw new Error(`Failed to download ZIP CSV: ${res.status} ${res.statusText}`);
		}
		const csvText = await res.text();
		const records = parse(csvText, {
			columns: ['zip', 'lat', 'lng'],
			skip_empty_lines: true
		}) as { lat: string; lng: string; zip: string }[];

		const map = new Map<string, { lat: number; lng: number }>();

		for (const r of records) {
			if (r.zip && r.lat && r.lng) {
				map.set(r.zip.trim(), {
					lat: parseFloat(r.lat),
					lng: parseFloat(r.lng)
				});
			}
		}

		zipMap = map; // Cache in memory
		return map;
	} catch (error) {
		console.error('Error loading ZIP map:', error);
		throw new Error('Unable to load geographic data. Please try again later.');
	}
}

export interface ZipCoordinate {
	lat?: number;
	lng?: number;
	zip: string;
}

// Funktion für mehrere PLZ
function getCoordinatesForZips(
	zips: string[],
	map: Map<string, { lat: number; lng: number }>
): ZipCoordinate[] {
	return zips.map((zip) => {
		const coords = map.get(zip.trim());
		if (!coords) return { zip };
		return { zip, ...coords };
	});
}

// POST-Handler
export const POST = async ({ request }) => {
	const body = await request.json();
	const zips = body
		.map((item: { zip?: string }) => item.zip)
		.filter((zip): zip is string => typeof zip === 'string' && zip.trim() !== '');

	const map = await loadZipMap();

	const results = getCoordinatesForZips(zips, map);

	return new Response(JSON.stringify(results), { status: 200 });
};
