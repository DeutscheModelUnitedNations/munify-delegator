import type { Feature, FeatureCollection, Point } from 'geojson';

/** A point on the statistics map; `zipPrefix` is empty for people drawn at their country's centre. */
export type ZipArea = { country: string; zipPrefix: string; count: number };

type Address = {
	country: string | null;
	zipPrefix: string | null;
	lat: number | null;
	lng: number | null;
	atCountryCentre: boolean | null;
	count: number;
};

/**
 * The map's points: one per ZIP area, and one per country for everyone whose area is unknown
 * (several such rows of a country share its centre, so they are summed into one).
 */
export function mapAreas(addresses: Address[]): FeatureCollection<Point, ZipArea> {
	const points = new Map<string, Feature<Point, ZipArea>>();
	for (const { country, zipPrefix, lat, lng, atCountryCentre, count } of addresses) {
		if (country === null || lat === null || lng === null) continue;
		// Postal codes are stored as typed: `sw1` and `SW1` are one area (as in `zipKey`).
		const area = atCountryCentre ? '' : (zipPrefix?.toUpperCase() ?? '');
		const known = points.get(`${country}:${area}`);
		if (known) known.properties.count += count;
		else
			points.set(`${country}:${area}`, {
				type: 'Feature',
				geometry: { type: 'Point', coordinates: [lng, lat] },
				properties: { country, zipPrefix: area, count }
			});
	}
	return { type: 'FeatureCollection', features: [...points.values()] };
}

function isZipArea(value: unknown): value is ZipArea {
	return (
		typeof value === 'object' &&
		value !== null &&
		'country' in value &&
		typeof value.country === 'string' &&
		'zipPrefix' in value &&
		typeof value.zipPrefix === 'string' &&
		'count' in value &&
		typeof value.count === 'number'
	);
}

/**
 * The areas of the features under a click, each once (MapLibre can report a feature once per
 * tile it touches). Several ZIP areas can share a centre, so a click may hit more than one.
 */
export function clickedAreas(features: { properties?: unknown }[] | undefined): ZipArea[] {
	const areas = new Map<string, ZipArea>();
	for (const { properties } of features ?? []) {
		if (isZipArea(properties))
			areas.set(`${properties.country}:${properties.zipPrefix}`, properties);
	}
	return [...areas.values()];
}
