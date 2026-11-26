import { describe, expect, test } from 'vitest';
import { clickedAreas, mapAreas } from './mapAreas';

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
