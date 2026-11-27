import type { Feature, FeatureCollection, Geometry } from 'geojson';

/**
 * The outlines world-countries ships, one GeoJSON file per country (9 MB together, Russia alone
 * 0.8 MB). Only their URLs are bundled; the globe fetches the country's and its neighbours' when
 * it shows, so nobody downloads the world.
 */
const shapeUrls = import.meta.glob<string>('/node_modules/world-countries/data/*.geo.json', {
	query: '?url',
	import: 'default',
	eager: true
});

export function shapeUrlOf(alpha3Code: string): string | undefined {
	return shapeUrls[`/node_modules/world-countries/data/${alpha3Code.toLowerCase()}.geo.json`];
}

export type ShapeRole = 'country' | 'neighbour';
export type ShapeProperties = { alpha3Code: string; role: ShapeRole; name: string };
export type CountryShapes = FeatureCollection<Geometry, ShapeProperties>;

function isFeatureCollection(value: unknown): value is FeatureCollection {
	return (
		typeof value === 'object' &&
		value !== null &&
		'type' in value &&
		value.type === 'FeatureCollection' &&
		'features' in value &&
		Array.isArray(value.features)
	);
}

/** The features of one country's file, tagged; none when it cannot be had. */
async function shapeOf({
	alpha3Code,
	role,
	name,
	fetcher
}: {
	alpha3Code: string;
	role: ShapeRole;
	name: string;
	fetcher: typeof fetch;
}): Promise<Feature<Geometry, ShapeProperties>[]> {
	const url = shapeUrlOf(alpha3Code);
	if (!url) return [];
	const response = await fetcher(url);
	if (!response.ok) throw new Error(`Loading the outline of ${alpha3Code} failed`);
	const data: unknown = await response.json();
	if (!isFeatureCollection(data)) return [];
	return data.features.map((feature) => ({
		type: 'Feature',
		geometry: feature.geometry,
		properties: { alpha3Code, role, name }
	}));
}

/**
 * The country's outline and its neighbours', in one collection for the globe's layers to filter
 * by `role`. A neighbour that fails to load is left out; the country itself failing throws, so
 * the globe can offer to try again.
 */
export async function loadCountryShapes({
	alpha3Code,
	borders,
	nameOf,
	fetcher = fetch
}: {
	alpha3Code: string;
	borders: string[];
	nameOf: (alpha3Code: string) => string;
	fetcher?: typeof fetch;
}): Promise<CountryShapes> {
	const [country, ...neighbours] = await Promise.all([
		shapeOf({ alpha3Code, role: 'country', name: nameOf(alpha3Code), fetcher }),
		...borders.map((border) =>
			shapeOf({ alpha3Code: border, role: 'neighbour', name: nameOf(border), fetcher }).catch(
				() => []
			)
		)
	]);
	// neighbours first, so the country is drawn over shared border lines
	return { type: 'FeatureCollection', features: [...neighbours.flat(), ...(country ?? [])] };
}

/**
 * A zoom at which the country takes about half a card of 400 px, leaving room for its neighbours:
 * at zoom z the world is 512·2^z px wide, about 40 000 km, so a country of width √area spans
 * 200 px at 2^z ≈ 10 000 / √area. Kept between a whole globe and a region, so the globe stays
 * round and even Monaco shows where it lies.
 */
export function zoomForArea(area: number): number {
	const zoom = Math.log2(10_000 / Math.sqrt(Math.max(area, 1)));
	return Math.min(3.5, Math.max(1.5, zoom));
}
