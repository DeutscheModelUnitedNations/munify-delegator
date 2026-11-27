import { describe, expect, test, vi } from 'vitest';
import { loadCountryShapes, shapeUrlOf, zoomForArea } from './countryShapes';

const square = {
	type: 'Polygon',
	coordinates: [
		[
			[0, 0],
			[1, 0],
			[1, 1],
			[0, 0]
		]
	]
};

const collection = { type: 'FeatureCollection', features: [{ type: 'Feature', geometry: square }] };

/** Serves every outline file, failing for the alpha-3 codes in `failing`. */
function fetcherFor({ failing = [] }: { failing?: string[] } = {}) {
	return vi.fn(async (url: string | URL | Request) => {
		const failed = failing.some((code) => String(url).includes(`${code.toLowerCase()}.geo.json`));
		return failed
			? new Response('', { status: 404 })
			: new Response(JSON.stringify(collection), { status: 200 });
	});
}

const nameOf = (alpha3Code: string) => `name of ${alpha3Code}`;

describe('shapeUrlOf', () => {
	test('knows the outline of a country in any case', () => {
		expect(shapeUrlOf('KEN')).toContain('ken.geo.json');
		expect(shapeUrlOf('ken')).toBe(shapeUrlOf('KEN'));
	});

	test('has none for an unknown code', () => {
		expect(shapeUrlOf('XXX')).toBeUndefined();
	});
});

describe('loadCountryShapes', () => {
	test('tags the country and its neighbours, the country last', async () => {
		const shapes = await loadCountryShapes({
			alpha3Code: 'KEN',
			borders: ['UGA', 'TZA'],
			nameOf,
			fetcher: fetcherFor()
		});
		expect(shapes.features.map(({ properties }) => properties)).toEqual([
			{ alpha3Code: 'UGA', role: 'neighbour', name: 'name of UGA' },
			{ alpha3Code: 'TZA', role: 'neighbour', name: 'name of TZA' },
			{ alpha3Code: 'KEN', role: 'country', name: 'name of KEN' }
		]);
		expect(shapes.features[0]?.geometry).toEqual(square);
	});

	test('leaves out a neighbour whose outline fails', async () => {
		const shapes = await loadCountryShapes({
			alpha3Code: 'KEN',
			borders: ['UGA', 'TZA'],
			nameOf,
			fetcher: fetcherFor({ failing: ['UGA'] })
		});
		expect(shapes.features.map(({ properties }) => properties.alpha3Code)).toEqual(['TZA', 'KEN']);
	});

	test("fails when the country's own outline fails", async () => {
		await expect(
			loadCountryShapes({
				alpha3Code: 'KEN',
				borders: [],
				nameOf,
				fetcher: fetcherFor({ failing: ['KEN'] })
			})
		).rejects.toThrow();
	});
});

describe('zoomForArea', () => {
	test.each([
		['Germany', 357_000, 3.5],
		['Kenya', 580_000, 3.5],
		['Brazil', 8_515_000, 1.8],
		['Russia', 17_100_000, 1.5],
		['Monaco', 2, 3.5]
	])('%s', (_name, area, zoom) => {
		expect(zoomForArea(area)).toBeCloseTo(zoom, 1);
	});
});
