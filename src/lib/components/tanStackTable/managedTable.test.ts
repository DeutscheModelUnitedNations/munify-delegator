import { describe, expect, test } from 'vitest';
import { soleFilteredRow } from './managedTable';

describe('soleFilteredRow', () => {
	const params = new URLSearchParams({ filter: 'x' });
	test('the single row a URL filter matched', () => {
		expect(soleFilteredRow(['r'], 'filter', params)).toBe('r');
	});
	test('nothing otherwise', () => {
		expect(soleFilteredRow(['r', 's'], 'filter', params)).toBeUndefined();
		expect(soleFilteredRow(['r'], undefined, params)).toBeUndefined();
		expect(soleFilteredRow(['r'], 'other', params)).toBeUndefined();
	});
});
