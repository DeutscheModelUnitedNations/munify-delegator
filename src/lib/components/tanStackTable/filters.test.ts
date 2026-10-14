import { describe, expect, test } from 'vitest';
import {
	filterFnFor,
	matchesEnumFilter,
	matchesRangeFilter,
	matchesTextFilter,
	toggledEnumFilter,
	updatedRangeFilter
} from './filters';
import type { TextFilterMode } from './filters';

describe('matchesTextFilter', () => {
	test('passes everything without a filter', () => {
		expect(matchesTextFilter('anything', undefined)).toBe(true);
	});

	test('isEmpty and isNotEmpty look at the raw value, ignoring the search text', () => {
		expect(matchesTextFilter(null, { mode: 'isEmpty', value: 'x' })).toBe(true);
		expect(matchesTextFilter(undefined, { mode: 'isEmpty', value: '' })).toBe(true);
		expect(matchesTextFilter('', { mode: 'isEmpty', value: '' })).toBe(true);
		expect(matchesTextFilter(0, { mode: 'isEmpty', value: '' })).toBe(false);
		expect(matchesTextFilter('Kiel', { mode: 'isNotEmpty', value: '' })).toBe(true);
		expect(matchesTextFilter(null, { mode: 'isNotEmpty', value: '' })).toBe(false);
		expect(matchesTextFilter('', { mode: 'isNotEmpty', value: '' })).toBe(false);
	});

	test('an empty search text passes every comparison mode', () => {
		const modes: TextFilterMode[] = [
			'contains',
			'containsNot',
			'equals',
			'equalsNot',
			'startsWith',
			'startsWithNot'
		];
		for (const mode of modes) {
			expect(matchesTextFilter('Kiel', { mode, value: '' })).toBe(true);
		}
	});

	test('compares case-insensitively', () => {
		expect(matchesTextFilter('Hamburg', { mode: 'contains', value: 'BURG' })).toBe(true);
		expect(matchesTextFilter('Hamburg', { mode: 'contains', value: 'kiel' })).toBe(false);
		expect(matchesTextFilter('Hamburg', { mode: 'containsNot', value: 'BURG' })).toBe(false);
		expect(matchesTextFilter('Hamburg', { mode: 'containsNot', value: 'kiel' })).toBe(true);
		expect(matchesTextFilter('Kiel', { mode: 'equals', value: 'KIEL' })).toBe(true);
		expect(matchesTextFilter('Kiel', { mode: 'equals', value: 'Kie' })).toBe(false);
		expect(matchesTextFilter('Kiel', { mode: 'equalsNot', value: 'KIEL' })).toBe(false);
		expect(matchesTextFilter('Kiel', { mode: 'equalsNot', value: 'Kie' })).toBe(true);
		expect(matchesTextFilter('Kiel', { mode: 'startsWith', value: 'ki' })).toBe(true);
		expect(matchesTextFilter('Kiel', { mode: 'startsWith', value: 'el' })).toBe(false);
		expect(matchesTextFilter('Kiel', { mode: 'startsWithNot', value: 'ki' })).toBe(false);
		expect(matchesTextFilter('Kiel', { mode: 'startsWithNot', value: 'el' })).toBe(true);
	});

	test('treats a missing cell value as an empty string and stringifies others', () => {
		expect(matchesTextFilter(null, { mode: 'contains', value: 'a' })).toBe(false);
		expect(matchesTextFilter(null, { mode: 'containsNot', value: 'a' })).toBe(true);
		expect(matchesTextFilter(1234, { mode: 'startsWith', value: '12' })).toBe(true);
	});
});

describe('matchesEnumFilter', () => {
	test('passes everything when nothing is selected', () => {
		expect(matchesEnumFilter('A', undefined)).toBe(true);
		expect(matchesEnumFilter('A', [])).toBe(true);
	});

	test('matches the stringified value against the selection', () => {
		expect(matchesEnumFilter('A', ['A', 'B'])).toBe(true);
		expect(matchesEnumFilter('C', ['A', 'B'])).toBe(false);
		expect(matchesEnumFilter(true, ['true'])).toBe(true);
	});

	test('maps empty cells to the dash placeholder', () => {
		expect(matchesEnumFilter(null, ['—'])).toBe(true);
		expect(matchesEnumFilter('', ['—'])).toBe(true);
		expect(matchesEnumFilter(undefined, ['A'])).toBe(false);
	});
});

describe('matchesRangeFilter', () => {
	test('passes everything without a filter', () => {
		expect(matchesRangeFilter(null, undefined)).toBe(true);
	});

	test('rejects missing values once a filter is set', () => {
		expect(matchesRangeFilter(null, [null, null])).toBe(false);
		expect(matchesRangeFilter(undefined, [1, 2])).toBe(false);
	});

	test('applies inclusive optional bounds', () => {
		expect(matchesRangeFilter(5, [null, null])).toBe(true);
		expect(matchesRangeFilter(5, [5, 5])).toBe(true);
		expect(matchesRangeFilter(4, [5, null])).toBe(false);
		expect(matchesRangeFilter(6, [null, 5])).toBe(false);
		expect(matchesRangeFilter(0, [0, 10])).toBe(true);
	});
});

describe('toggledEnumFilter', () => {
	test('adds a value that is not selected yet', () => {
		expect(toggledEnumFilter(undefined, 'A')).toEqual(['A']);
		expect(toggledEnumFilter(['A'], 'B')).toEqual(['A', 'B']);
	});

	test('removes a selected value and clears the filter once empty', () => {
		expect(toggledEnumFilter(['A', 'B'], 'A')).toEqual(['B']);
		expect(toggledEnumFilter(['A'], 'A')).toBeUndefined();
	});
});

describe('updatedRangeFilter', () => {
	test('sets one bound and keeps the other', () => {
		expect(updatedRangeFilter(undefined, 0, '18')).toEqual([18, null]);
		expect(updatedRangeFilter([18, null], 1, '25')).toEqual([18, 25]);
	});

	test('an empty input clears a bound, and no bounds clear the filter', () => {
		expect(updatedRangeFilter([18, 25], 1, '')).toEqual([18, null]);
		expect(updatedRangeFilter([18, null], 0, '')).toBeUndefined();
	});

	test('does not modify the current value', () => {
		const current: [number | null, number | null] = [1, 2];
		updatedRangeFilter(current, 0, '5');
		expect(current).toEqual([1, 2]);
	});
});

describe('filterFnFor', () => {
	test('has a filter function for every kind of filter', () => {
		const types = ['text', 'enum', 'boolean', 'range'] as const;
		const fns = types.map((type) => filterFnFor(type));
		for (const fn of fns) expect(fn).toBeTypeOf('function');
		expect(new Set(fns).size).toBe(types.length);
	});
});
