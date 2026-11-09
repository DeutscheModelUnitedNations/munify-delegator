import { describe, expect, it } from 'vitest';
import { starTarget } from './starRating';

describe('starTarget', () => {
	it('sets the clicked number of stars', () => {
		expect(starTarget({ rating: 0, position: 3 })).toBe(3);
		expect(starTarget({ rating: 4, position: 2 })).toBe(2);
		expect(starTarget({ rating: 2.5, position: 3 })).toBe(3);
	});

	it('halves the last full star when it is clicked again', () => {
		expect(starTarget({ rating: 3, position: 3 })).toBe(2.5);
		expect(starTarget({ rating: 1, position: 1 })).toBe(0.5);
	});
});
