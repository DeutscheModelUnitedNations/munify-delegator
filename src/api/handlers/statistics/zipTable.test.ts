import { describe, expect, test } from 'vitest';
import { buildZipTable, hasZipAreas, normalizeCountry, parseZipTable, zipKey } from './zipTable';

describe('zipKey', () => {
	test('cuts and cleans the ZIP as the view does', () => {
		expect(zipKey({ country: 'DEU', zip: '64289' })).toBe('DEU\t642');
		expect(zipKey({ country: 'gbr', zip: 'm1 1ae' })).toBe('GBR\tM1');
		expect(zipKey({ country: 'HRV', zip: '10 ' })).toBe('HRV\t10');
	});

	test('takes alpha-2 countries', () => {
		expect(zipKey({ country: 'DE', zip: '642' })).toBe('DEU\t642');
		expect(normalizeCountry('XX')).toBe('XX');
	});
});

describe('hasZipAreas', () => {
	test('keeps Europe, Western Asia and Northern Africa', () => {
		for (const country of ['DEU', 'GBR', 'HRV', 'TUR', 'ISR', 'MA'])
			expect(hasZipAreas(country)).toBe(true);
		for (const country of ['USA', 'BRA', 'ZAF', 'JPN', 'IND', 'AUS'])
			expect(hasZipAreas(country)).toBe(false);
	});
});

describe('buildZipTable', () => {
	test('leaves out countries outside the mapped regions', () => {
		expect(buildZipTable([{ country: 'US', zip: '10001', lat: 40.75, lng: -74 }])).toBe('');
	});

	test('places each area at the mean of its postal codes, sorted', () => {
		const table = buildZipTable([
			{ country: 'DE', zip: '64289', lat: 49.8, lng: 8.6 },
			{ country: 'DE', zip: '64283', lat: 49.9, lng: 8.7 },
			{ country: 'AT', zip: '1010', lat: 48.2, lng: 16.37 },
			{ country: 'DE', zip: ' ', lat: 1, lng: 1 }
		]);
		expect(table).toBe('AUT\t101\t48.200\t16.370\nDEU\t642\t49.850\t8.650');
	});

	test('round-trips through parseZipTable', () => {
		const table = parseZipTable(
			buildZipTable([{ country: 'DK', zip: '8000', lat: 56.15, lng: 10.2 }])
		);
		expect(table.get(zipKey({ country: 'DNK', zip: '800' }))).toEqual({ lat: 56.15, lng: 10.2 });
		expect(table.size).toBe(1);
	});
});
