import { describe, expect, it } from 'vitest';
import { latitudeSchema, longitudeSchema } from './placeRules';

describe('coordinates', () => {
	it('takes degrees within range, and nothing', () => {
		expect(latitudeSchema.safeParse(52.5).success).toBe(true);
		expect(longitudeSchema.safeParse(-122.4).success).toBe(true);
		expect(latitudeSchema.safeParse(null).success).toBe(true);
		expect(longitudeSchema.safeParse(undefined).success).toBe(true);
	});

	it('refuses degrees out of range', () => {
		expect(latitudeSchema.safeParse(91).success).toBe(false);
		expect(longitudeSchema.safeParse(-181).success).toBe(false);
	});
});
