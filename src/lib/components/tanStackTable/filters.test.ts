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
		expect(matchesTextFilter({ rawValue: 'anything', filterValue: undefined })).toBe(true);
	});

	test('isEmpty and isNotEmpty look at the raw value, ignoring the search text', () => {
		expect(
			matchesTextFilter({ rawValue: null, filterValue: { mode: 'isEmpty', value: 'x' } })
		).toBe(true);
		expect(
			matchesTextFilter({ rawValue: undefined, filterValue: { mode: 'isEmpty', value: '' } })
		).toBe(true);
		expect(matchesTextFilter({ rawValue: '', filterValue: { mode: 'isEmpty', value: '' } })).toBe(
			true
		);
		expect(matchesTextFilter({ rawValue: 0, filterValue: { mode: 'isEmpty', value: '' } })).toBe(
			false
		);
		expect(
			matchesTextFilter({ rawValue: 'Kiel', filterValue: { mode: 'isNotEmpty', value: '' } })
		).toBe(true);
		expect(
			matchesTextFilter({ rawValue: null, filterValue: { mode: 'isNotEmpty', value: '' } })
		).toBe(false);
		expect(
			matchesTextFilter({ rawValue: '', filterValue: { mode: 'isNotEmpty', value: '' } })
		).toBe(false);
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
			expect(matchesTextFilter({ rawValue: 'Kiel', filterValue: { mode, value: '' } })).toBe(true);
		}
	});

	test('compares case-insensitively', () => {
		expect(
			matchesTextFilter({ rawValue: 'Hamburg', filterValue: { mode: 'contains', value: 'BURG' } })
		).toBe(true);
		expect(
			matchesTextFilter({ rawValue: 'Hamburg', filterValue: { mode: 'contains', value: 'kiel' } })
		).toBe(false);
		expect(
			matchesTextFilter({
				rawValue: 'Hamburg',
				filterValue: { mode: 'containsNot', value: 'BURG' }
			})
		).toBe(false);
		expect(
			matchesTextFilter({
				rawValue: 'Hamburg',
				filterValue: { mode: 'containsNot', value: 'kiel' }
			})
		).toBe(true);
		expect(
			matchesTextFilter({ rawValue: 'Kiel', filterValue: { mode: 'equals', value: 'KIEL' } })
		).toBe(true);
		expect(
			matchesTextFilter({ rawValue: 'Kiel', filterValue: { mode: 'equals', value: 'Kie' } })
		).toBe(false);
		expect(
			matchesTextFilter({ rawValue: 'Kiel', filterValue: { mode: 'equalsNot', value: 'KIEL' } })
		).toBe(false);
		expect(
			matchesTextFilter({ rawValue: 'Kiel', filterValue: { mode: 'equalsNot', value: 'Kie' } })
		).toBe(true);
		expect(
			matchesTextFilter({ rawValue: 'Kiel', filterValue: { mode: 'startsWith', value: 'ki' } })
		).toBe(true);
		expect(
			matchesTextFilter({ rawValue: 'Kiel', filterValue: { mode: 'startsWith', value: 'el' } })
		).toBe(false);
		expect(
			matchesTextFilter({ rawValue: 'Kiel', filterValue: { mode: 'startsWithNot', value: 'ki' } })
		).toBe(false);
		expect(
			matchesTextFilter({ rawValue: 'Kiel', filterValue: { mode: 'startsWithNot', value: 'el' } })
		).toBe(true);
	});

	test('treats a missing cell value as an empty string and stringifies others', () => {
		expect(
			matchesTextFilter({ rawValue: null, filterValue: { mode: 'contains', value: 'a' } })
		).toBe(false);
		expect(
			matchesTextFilter({ rawValue: null, filterValue: { mode: 'containsNot', value: 'a' } })
		).toBe(true);
		expect(
			matchesTextFilter({ rawValue: 1234, filterValue: { mode: 'startsWith', value: '12' } })
		).toBe(true);
	});
});

describe('matchesEnumFilter', () => {
	test('passes everything when nothing is selected', () => {
		expect(matchesEnumFilter({ rawValue: 'A', filterValue: undefined })).toBe(true);
		expect(matchesEnumFilter({ rawValue: 'A', filterValue: [] })).toBe(true);
	});

	test('matches the stringified value against the selection', () => {
		expect(matchesEnumFilter({ rawValue: 'A', filterValue: ['A', 'B'] })).toBe(true);
		expect(matchesEnumFilter({ rawValue: 'C', filterValue: ['A', 'B'] })).toBe(false);
		expect(matchesEnumFilter({ rawValue: true, filterValue: ['true'] })).toBe(true);
	});

	test('maps empty cells to the dash placeholder', () => {
		expect(matchesEnumFilter({ rawValue: null, filterValue: ['—'] })).toBe(true);
		expect(matchesEnumFilter({ rawValue: '', filterValue: ['—'] })).toBe(true);
		expect(matchesEnumFilter({ rawValue: undefined, filterValue: ['A'] })).toBe(false);
	});
});

describe('matchesRangeFilter', () => {
	test('passes everything without a filter', () => {
		expect(matchesRangeFilter({ value: null, filterValue: undefined })).toBe(true);
	});

	test('rejects missing values once a filter is set', () => {
		expect(matchesRangeFilter({ value: null, filterValue: [null, null] })).toBe(false);
		expect(matchesRangeFilter({ value: undefined, filterValue: [1, 2] })).toBe(false);
	});

	test('applies inclusive optional bounds', () => {
		expect(matchesRangeFilter({ value: 5, filterValue: [null, null] })).toBe(true);
		expect(matchesRangeFilter({ value: 5, filterValue: [5, 5] })).toBe(true);
		expect(matchesRangeFilter({ value: 4, filterValue: [5, null] })).toBe(false);
		expect(matchesRangeFilter({ value: 6, filterValue: [null, 5] })).toBe(false);
		expect(matchesRangeFilter({ value: 0, filterValue: [0, 10] })).toBe(true);
	});
});

describe('toggledEnumFilter', () => {
	test('adds a value that is not selected yet', () => {
		expect(toggledEnumFilter({ current: undefined, value: 'A' })).toEqual(['A']);
		expect(toggledEnumFilter({ current: ['A'], value: 'B' })).toEqual(['A', 'B']);
	});

	test('removes a selected value and clears the filter once empty', () => {
		expect(toggledEnumFilter({ current: ['A', 'B'], value: 'A' })).toEqual(['B']);
		expect(toggledEnumFilter({ current: ['A'], value: 'A' })).toBeUndefined();
	});
});

describe('updatedRangeFilter', () => {
	test('sets one bound and keeps the other', () => {
		expect(updatedRangeFilter({ current: undefined, index: 0, value: '18' })).toEqual([18, null]);
		expect(updatedRangeFilter({ current: [18, null], index: 1, value: '25' })).toEqual([18, 25]);
	});

	test('an empty input clears a bound, and no bounds clear the filter', () => {
		expect(updatedRangeFilter({ current: [18, 25], index: 1, value: '' })).toEqual([18, null]);
		expect(updatedRangeFilter({ current: [18, null], index: 0, value: '' })).toBeUndefined();
	});

	test('does not modify the current value', () => {
		const current: [number | null, number | null] = [1, 2];
		updatedRangeFilter({ current, index: 0, value: '5' });
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
