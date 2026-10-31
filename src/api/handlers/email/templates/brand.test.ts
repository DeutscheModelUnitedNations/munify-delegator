import { describe, expect, it } from 'vitest';
import { brand, cssVariable } from './brand';

describe('cssVariable', () => {
	it('reads a declared custom property', () => {
		expect(cssVariable({ css: ':root { --a: #fff; --b: 1px; }', name: '--b' })).toBe('1px');
	});

	it('throws when the property is missing', () => {
		expect(() => cssVariable({ css: ':root { --a: #fff; }', name: '--b' })).toThrow('--b');
	});
});

describe('brand', () => {
	it('carries the corporate identity as plain values mail clients understand', () => {
		for (const value of Object.values(brand)) expect(value).not.toMatch(/var\(/);
		expect(brand.primary).toMatch(/^#[0-9a-f]{6}$/i);
		expect(brand.font).toContain('Outfit');
	});
});
