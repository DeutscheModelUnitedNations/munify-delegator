import type { Feature, FeatureCollection, Point, Polygon } from 'geojson';

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

/** A ZIP area as a column of the 3D map: its hexagon, and its height in metres. */
export type ZipColumn = ZipArea & { height: number };

const KM_PER_DEGREE = 111.32;

/** How high the column of the busiest area rises, in metres: high enough to read at country zoom. */
export const TALLEST_COLUMN_METRES = 120_000;

/**
 * The areas as hexagonal columns for MapLibre's fill extrusion: `radiusKm` around each centre,
 * heights in proportion to the participants, the busiest area `TALLEST_COLUMN_METRES` high.
 * Busy areas come last, so they are drawn over neighbours they overlap.
 */
export function areaColumns({
	areas,
	radiusKm
}: {
	areas: FeatureCollection<Point, ZipArea>;
	radiusKm: number;
}): FeatureCollection<Polygon, ZipColumn> {
	const most = Math.max(1, ...areas.features.map((area) => area.properties.count));
	return {
		type: 'FeatureCollection',
		features: areas.features
			.toSorted((a, b) => a.properties.count - b.properties.count)
			.map((area) => {
				const [lng = 0, lat = 0] = area.geometry.coordinates;
				const dLat = radiusKm / KM_PER_DEGREE;
				const dLng = radiusKm / (KM_PER_DEGREE * Math.cos((lat * Math.PI) / 180));
				const corners = Array.from({ length: 6 }, (_, index) => {
					const angle = (Math.PI / 3) * index;
					return [lng + dLng * Math.cos(angle), lat + dLat * Math.sin(angle)];
				});
				return {
					type: 'Feature',
					geometry: { type: 'Polygon', coordinates: [[...corners, corners[0] ?? [lng, lat]]] },
					properties: {
						...area.properties,
						height: Math.round((area.properties.count / most) * TALLEST_COLUMN_METRES)
					}
				};
			})
	};
}
