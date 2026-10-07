import { describe, expect, test } from 'vitest';
import { defaultColumnFilters } from './tableState';

describe('defaultColumnFilters', () => {
	test('filters to accepted participants in later conference states', () => {
		for (const state of ['PREPARATION', 'ACTIVE', 'POST']) {
			expect(defaultColumnFilters(state)).toEqual([{ id: 'accepted', value: true }]);
		}
	});

	test('no filter in early states or without a state', () => {
		expect(defaultColumnFilters('PRE')).toEqual([]);
		expect(defaultColumnFilters('PARTICIPANT_REGISTRATION')).toEqual([]);
		expect(defaultColumnFilters(undefined)).toEqual([]);
		expect(defaultColumnFilters(null)).toEqual([]);
	});
});
