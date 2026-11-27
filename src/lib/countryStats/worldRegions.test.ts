import { describe, expect, test } from 'vitest';
import worldCountries from 'world-countries';
import { translateWorldRegion } from './worldRegions';

describe('translateWorldRegion', () => {
	test('names subregion and region in the locale', () => {
		expect(translateWorldRegion({ region: 'Africa', subregion: 'Eastern Africa' })).toBe(
			'Ostafrika (Afrika)'
		);
	});

	test('names the region alone without subregion', () => {
		expect(translateWorldRegion({ region: 'Antarctic', subregion: '' })).toBe('Antarktis');
	});

	test('translates every region and subregion world-countries has', () => {
		for (const { region, subregion } of worldCountries) {
			// an untranslated name would come first as the package spells it
			const label = translateWorldRegion({ region, subregion });
			expect(label.startsWith(subregion || region), label).toBe(false);
		}
	});
});
