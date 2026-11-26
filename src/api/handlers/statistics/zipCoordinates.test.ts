import { describe, expect, test } from 'vitest';
import { zipCoordinates } from './zipCoordinates';

describe('zipCoordinates', () => {
	test('finds a ZIP area, also of an alpha-2 country', () => {
		const darmstadt = zipCoordinates({ country: 'DEU', zipPrefix: '642' });
		expect(darmstadt?.atCountryCentre).toBe(false);
		expect(darmstadt?.lat).toBeCloseTo(49.87, 0);
		expect(zipCoordinates({ country: 'DE', zipPrefix: '642' })).toEqual(darmstadt);
	});

	test('falls back to the country centre for an unknown or missing area', () => {
		const egypt = zipCoordinates({ country: 'EGY', zipPrefix: '115' });
		expect(egypt).toEqual({ lat: 27, lng: 30, atCountryCentre: true });
		expect(zipCoordinates({ country: 'EGY', zipPrefix: null })).toEqual(egypt);
	});

	test('knows nothing of an unknown country', () => {
		expect(zipCoordinates({ country: 'XXX', zipPrefix: '123' })).toBeUndefined();
	});
});
