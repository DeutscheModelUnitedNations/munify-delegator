import { describe, expect, test } from 'vitest';
import { LAYOUT_ZOOMS, scrollKeeping, zoomStep } from './layoutZoom';

describe('zoomStep', () => {
	test('goes to the next level in and out', () => {
		expect(zoomStep({ zoom: 1, step: 1 })).toBe(1.5);
		expect(zoomStep({ zoom: 3, step: -1 })).toBe(2);
	});

	test('stays at the ends', () => {
		expect(zoomStep({ zoom: LAYOUT_ZOOMS[0], step: -1 })).toBe(1);
		expect(zoomStep({ zoom: LAYOUT_ZOOMS.at(-1) ?? 4, step: 1 })).toBe(4);
	});

	test('from between two levels, to the nearer one in that direction', () => {
		expect(zoomStep({ zoom: 1.2, step: 1 })).toBe(1.5);
		expect(zoomStep({ zoom: 1.2, step: -1 })).toBe(1);
	});
});

describe('scrollKeeping', () => {
	test('keeps the middle of the view on the same spot of the page', () => {
		// a 400 px view on a 800 px page scrolled to 200: the middle is at 400, at 800 when doubled
		expect(scrollKeeping({ scroll: 200, anchor: 200, factor: 2 })).toBe(600);
	});

	test('keeps the point under the pointer', () => {
		expect(scrollKeeping({ scroll: 0, anchor: 100, factor: 1.5 })).toBe(50);
	});

	test('never scrolls before the start', () => {
		expect(scrollKeeping({ scroll: 0, anchor: 300, factor: 0.5 })).toBe(0);
	});
});
