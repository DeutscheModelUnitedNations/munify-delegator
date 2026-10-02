import { describe, expect, test } from 'vitest';
import {
	defaultColumnFilters,
	defaultColumnVisibility,
	initialColumnVisibility,
	parseColumnFilters
} from './tableState';

describe('parseColumnFilters', () => {
	test('reads a filter array from the URL', () => {
		expect(parseColumnFilters('[{"id":"role","value":["SUPERVISOR"]}]')).toEqual([
			{ id: 'role', value: ['SUPERVISOR'] }
		]);
	});

	test('ignores anything else', () => {
		expect(parseColumnFilters('{"id":"role"}')).toBeUndefined();
		expect(parseColumnFilters('not json')).toBeUndefined();
	});
});

describe('defaultColumnFilters', () => {
	test('filters to accepted participants in later conference states', () => {
		for (const state of ['PREPARATION', 'ACTIVE', 'POST']) {
			expect(defaultColumnFilters(false, state)).toEqual([{ id: 'accepted', value: true }]);
		}
	});

	test('does nothing in early states, without a state, or once applied', () => {
		expect(defaultColumnFilters(false, 'PRE')).toBeUndefined();
		expect(defaultColumnFilters(false, 'PARTICIPANT_REGISTRATION')).toBeUndefined();
		expect(defaultColumnFilters(false, undefined)).toBeUndefined();
		expect(defaultColumnFilters(false, null)).toBeUndefined();
		expect(defaultColumnFilters(true, 'ACTIVE')).toBeUndefined();
	});
});

const meta = (defaultVisible: boolean) => ({ defaultVisible });
const columns = [
	{ accessorKey: 'given_name', meta: meta(true) },
	{ accessorKey: 'email', meta: meta(false) },
	{ id: 'actions', meta: meta(true) },
	{ id: 'noMeta' },
	{ meta: meta(true) }
];

describe('defaultColumnVisibility', () => {
	test('uses the accessor key or id of every column with meta', () => {
		expect(defaultColumnVisibility(columns)).toEqual({
			given_name: true,
			email: false,
			actions: true
		});
	});
});

describe('initialColumnVisibility', () => {
	test('prefers the stored visibility', () => {
		expect(initialColumnVisibility('{"email":true}', columns)).toEqual({ email: true });
	});

	test('falls back to the defaults when nothing is stored', () => {
		expect(initialColumnVisibility(null, columns)).toEqual(defaultColumnVisibility(columns));
		expect(initialColumnVisibility('', columns)).toEqual(defaultColumnVisibility(columns));
	});

	test('leaves the visibility alone when the stored value is unreadable', () => {
		expect(initialColumnVisibility('{broken', columns)).toBeUndefined();
	});
});
