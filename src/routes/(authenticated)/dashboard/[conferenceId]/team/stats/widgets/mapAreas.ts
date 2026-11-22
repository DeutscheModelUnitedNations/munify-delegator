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
		const area = atCountryCentre ? '' : (zipPrefix ?? '');
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
