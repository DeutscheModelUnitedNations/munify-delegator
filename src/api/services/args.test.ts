import { describe, expect, test } from 'vitest';
import { nullToUndefined } from './args';

describe('nullToUndefined', () => {
	test('turns null and undefined into undefined', () => {
		expect(nullToUndefined(null)).toBeUndefined();
		expect(nullToUndefined(undefined)).toBeUndefined();
	});

	test('keeps every other value, falsy ones included', () => {
		expect(nullToUndefined(false)).toBe(false);
		expect(nullToUndefined(0)).toBe(0);
		expect(nullToUndefined('')).toBe('');
		const date = new Date();
		expect(nullToUndefined(date)).toBe(date);
	});
});
