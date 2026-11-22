import { describe, expect, it } from 'vitest';
import { bulkScale } from './bulk';

describe('bulkScale', () => {
	it('seeds the whole bulk by default', () => {
		expect(bulkScale({ argv: ['bun', 'seedDev.ts'], env: {} })).toBe(1);
	});

	it('follows SEED_BULK_SCALE', () => {
		expect(bulkScale({ argv: [], env: { SEED_BULK_SCALE: '0.1' } })).toBe(0.1);
		expect(bulkScale({ argv: [], env: { SEED_BULK_SCALE: '0' } })).toBe(0);
	});

	it('switches the bulk off for --small, whatever SEED_BULK_SCALE says', () => {
		expect(bulkScale({ argv: ['bun', 'seedDev.ts', '--small'], env: {} })).toBe(0);
		expect(bulkScale({ argv: ['--small'], env: { SEED_BULK_SCALE: '2' } })).toBe(0);
	});

	it('refuses a scale that is not a non-negative number', () => {
		expect(() => bulkScale({ argv: [], env: { SEED_BULK_SCALE: '-1' } })).toThrow();
		expect(() => bulkScale({ argv: [], env: { SEED_BULK_SCALE: 'lots' } })).toThrow();
	});
});
