import { describe, expect, test } from 'vitest';
import { gaugeColor } from './gaugeColor';

describe('gaugeColor', () => {
	test('turns from red over amber to green as the value rises', () => {
		expect(gaugeColor({ value: 10, min: 0, max: 100 })).toBe('#ef4444');
		expect(gaugeColor({ value: 50, min: 0, max: 100 })).toBe('#f59e0b');
		expect(gaugeColor({ value: 66, min: 0, max: 100 })).toBe('#10b981');
	});

	test('measures from min, not from zero', () => {
		expect(gaugeColor({ value: 60, min: 50, max: 100 })).toBe('#ef4444');
	});

	test('is green for an empty range', () => {
		expect(gaugeColor({ value: 5, min: 5, max: 5 })).toBe('#10b981');
	});
});
