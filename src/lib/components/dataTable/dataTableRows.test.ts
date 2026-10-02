import { describe, expect, test } from 'vitest';
import { expandKeyOf, soleFilteredRow, toggleExpandedKey } from './dataTableRows';

describe('expandKeyOf', () => {
	test('prefers the row key, falls back to the id', () => {
		expect(expandKeyOf({ rowKey: 'a', id: 'b' })).toBe('a');
		expect(expandKeyOf({ rowKey: null, id: 'b' })).toBe('b');
		expect(expandKeyOf({ rowKey: undefined, id: 3 })).toBe(3);
		expect(expandKeyOf({ id: 4 })).toBe(4);
	});
	test('only strings and numbers count', () => {
		expect(expandKeyOf({})).toBeUndefined();
		expect(expandKeyOf({ id: { nested: true } })).toBeUndefined();
		expect(expandKeyOf({ rowKey: false, id: 'b' })).toBeUndefined();
	});
});

describe('toggleExpandedKey', () => {
	test('closes an open row', () => {
		expect(toggleExpandedKey(['a', 'b'], 'a', false)).toEqual(['b']);
	});
	test('opens a row next to the others, or alone', () => {
		expect(toggleExpandedKey(['a'], 'b', false)).toEqual(['a', 'b']);
		expect(toggleExpandedKey(['a'], 'b', true)).toEqual(['b']);
	});
});

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
