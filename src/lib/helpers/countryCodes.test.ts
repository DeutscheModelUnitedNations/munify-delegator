import { describe, expect, it } from 'vitest';
import { alpha2ToAlpha3, alpha3ToAlpha2 } from './countryCodes';

describe('countryCodes', () => {
	it('converts between alpha-3 and alpha-2', () => {
		expect(alpha3ToAlpha2('DEU')).toBe('DE');
		expect(alpha3ToAlpha2('usa')).toBe('US');
		expect(alpha2ToAlpha3('AT')).toBe('AUT');
		expect(alpha2ToAlpha3('fr')).toBe('FRA');
	});

	it('answers undefined for unknown codes', () => {
		expect(alpha3ToAlpha2('XXX')).toBeUndefined();
		expect(alpha2ToAlpha3('QQ')).toBeUndefined();
	});
});
