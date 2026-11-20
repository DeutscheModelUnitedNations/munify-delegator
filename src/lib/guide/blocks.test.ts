import { expect, test } from 'vitest';
import { calloutClass, calloutColor } from './blocks';

test('calloutColor falls back to info', () => {
	expect(calloutColor('warning')).toBe('warning');
	expect(calloutColor('purple')).toBe('info');
	expect(calloutColor(undefined)).toBe('info');
});

test('calloutClass uses the alert tones, neutral the base colours', () => {
	expect(calloutClass('success')).toBe('alert-success alert-soft');
	expect(calloutClass('neutral')).toBe('bg-base-200 border-base-300');
});
