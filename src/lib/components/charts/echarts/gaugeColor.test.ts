import { describe, expect, test } from 'vitest';
import { gaugeColor } from './gaugeColor';

describe('gaugeColor', () => {
	test('turns from red over amber to green as the value rises', () => {
		expect(gaugeColor(10, 0, 100)).toBe('#ef4444');
		expect(gaugeColor(50, 0, 100)).toBe('#f59e0b');
		expect(gaugeColor(66, 0, 100)).toBe('#10b981');
	});

	test('measures from min, not from zero', () => {
		expect(gaugeColor(60, 50, 100)).toBe('#ef4444');
	});

	test('is green for an empty range', () => {
		expect(gaugeColor(5, 5, 5)).toBe('#10b981');
	});
});
