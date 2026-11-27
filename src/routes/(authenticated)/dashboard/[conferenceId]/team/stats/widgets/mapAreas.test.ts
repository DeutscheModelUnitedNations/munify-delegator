import { describe, expect, test } from 'vitest';
import { TALLEST_COLUMN_METRES, areaColumns, clickedAreas, mapAreas } from './mapAreas';

const row = (over: Partial<Parameters<typeof mapAreas>[0][number]>) => ({
	country: 'DEU',
	zipPrefix: '642',
	lat: 49.8,
	lng: 8.6,
	atCountryCentre: false,
	count: 1,
	...over
});

describe('mapAreas', () => {
	test('one point per ZIP area', () => {
		const { features } = mapAreas([row({ count: 2 }), row({ zipPrefix: '643', count: 3 })]);
		expect(features.map((f) => f.properties)).toEqual([
			{ country: 'DEU', zipPrefix: '642', count: 2 },
			{ country: 'DEU', zipPrefix: '643', count: 3 }
		]);
		expect(features[0]?.geometry.coordinates).toEqual([8.6, 49.8]);
	});

	test('sums the people of a country whose area is unknown into one point', () => {
		const { features } = mapAreas([
			row({ country: 'EGY', zipPrefix: '115', atCountryCentre: true, lat: 27, lng: 30, count: 2 }),
			row({ country: 'EGY', zipPrefix: null, atCountryCentre: true, lat: 27, lng: 30, count: 3 })
		]);
		expect(features.map((f) => f.properties)).toEqual([
			{ country: 'EGY', zipPrefix: '', count: 5 }
		]);
	});

	test('leaves out rows without a country or coordinates', () => {
		expect(
			mapAreas([row({ country: null }), row({ lat: null, lng: null, atCountryCentre: null })])
				.features
		).toEqual([]);
	});

	test('case variants of a prefix are one area', () => {
		const { features } = mapAreas([
			row({ country: 'GBR', zipPrefix: 'sw1', count: 2 }),
			row({ country: 'GBR', zipPrefix: 'SW1', count: 3 })
		]);
		expect(features.map((f) => f.properties)).toEqual([
			{ country: 'GBR', zipPrefix: 'SW1', count: 5 }
		]);
	});
});

describe('clickedAreas', () => {
	test('lists every area under the click once', () => {
		const albania100 = { country: 'ALB', zipPrefix: '100', count: 2 };
		const albania101 = { country: 'ALB', zipPrefix: '101', count: 1 };
		expect(
			clickedAreas([
				{ properties: albania100 },
				{ properties: albania101 },
				{ properties: albania100 },
				{ properties: { cluster_id: 4 } },
				{}
			])
		).toEqual([albania100, albania101]);
	});

	test('nothing clicked is no area', () => {
		expect(clickedAreas(undefined)).toEqual([]);
	});
});

describe('areaColumns', () => {
	const areas = mapAreas([
		row({ zipPrefix: '642', count: 4 }),
		row({ zipPrefix: '101', lat: 52.5, lng: 13.4, count: 1 })
	]);

	test('scales the heights to the busiest area, drawn last', () => {
		const { features } = areaColumns({ areas, radiusKm: 5 });
		expect(features.map((f) => [f.properties.zipPrefix, f.properties.height])).toEqual([
			['101', TALLEST_COLUMN_METRES / 4],
			['642', TALLEST_COLUMN_METRES]
		]);
	});

	test('draws a closed hexagon of the given radius around the centre', () => {
		const ring = areaColumns({ areas, radiusKm: 5 }).features[1]?.geometry.coordinates[0] ?? [];
		expect(ring).toHaveLength(7);
		expect(ring[6]).toEqual(ring[0]);
		// The corner due east is 5 km away: wider in degrees of longitude than of latitude up north.
		const [east] = ring;
		expect((east?.[0] ?? 0) - 8.6).toBeCloseTo(5 / (111.32 * Math.cos((49.8 * Math.PI) / 180)));
		expect(east?.[1]).toBeCloseTo(49.8);
	});

	test('has no columns without areas', () => {
		expect(
			areaColumns({ areas: { type: 'FeatureCollection', features: [] }, radiusKm: 5 }).features
		).toEqual([]);
	});
});
