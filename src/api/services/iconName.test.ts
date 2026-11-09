import { describe, expect, it } from 'vitest';
import { iconArgSchema, isPhosphorIcon } from './iconName';

describe('isPhosphorIcon', () => {
	it('knows Phosphor names and nothing else', () => {
		expect(isPhosphorIcon('leaf')).toBe(true);
		expect(isPhosphorIcon('paw-print')).toBe(true);
		expect(isPhosphorIcon('paw')).toBe(false);
		expect(isPhosphorIcon('ph-leaf')).toBe(false);
		expect(isPhosphorIcon('fa-leaf')).toBe(false);
	});
});

describe('iconArgSchema', () => {
	it('takes a Phosphor name, empty, null or nothing', () => {
		for (const value of ['scales', '', null, undefined]) {
			expect(iconArgSchema.safeParse(value).success).toBe(true);
		}
	});

	it('refuses Font Awesome and unknown names', () => {
		for (const value of ['scale-balanced', 'fa-tree', 'nonsense']) {
			expect(iconArgSchema.safeParse(value).success).toBe(false);
		}
	});
});
