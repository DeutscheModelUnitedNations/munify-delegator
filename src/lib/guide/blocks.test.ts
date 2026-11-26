import { expect, test } from 'vitest';
import { calloutClass, calloutColor, calloutIcon } from './blocks';

test('calloutColor falls back to info', () => {
	expect(calloutColor('warning')).toBe('warning');
	expect(calloutColor('purple')).toBe('info');
	expect(calloutColor(undefined)).toBe('info');
});

test('calloutClass uses the alert tones, neutral the base colours', () => {
	expect(calloutClass('success')).toBe('alert-success alert-soft');
	expect(calloutClass('neutral')).toBe('bg-base-200 border-base-300');
});

test('calloutIcon keeps Phosphor names and refuses anything else', () => {
	expect(calloutIcon('map-pin')).toBe('map-pin');
	expect(calloutIcon('question')).toBe('question');
	expect(calloutIcon('❓')).toBe('info');
	expect(calloutIcon('x" onclick="alert(1)')).toBe('info');
	expect(calloutIcon('Map-Pin')).toBe('info');
	expect(calloutIcon('a'.repeat(61))).toBe('info');
	expect(calloutIcon(undefined)).toBe('info');
});
