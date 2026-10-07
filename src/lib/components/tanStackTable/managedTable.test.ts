import { describe, expect, test } from 'vitest';
import {
	defaultColumnVisibility,
	initialColumnVisibility,
	parseColumnFilters,
	sameSorting,
	shownColumnsParam,
	shownFromVisibility,
	sortingParam,
	visibilityFromShown,
	filtersParam,
	soleFilteredRow,
	tableExport,
	type ManagedColumn
} from './managedTable';

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

describe('tableExport', () => {
	interface Row {
		name: string;
		age: number | null;
		hidden: boolean;
	}
	const columns: ManagedColumn<Row>[] = [
		{ id: 'actions', header: '' },
		{ accessorKey: 'name', header: 'Name' },
		{ accessorKey: 'age', header: 'Age' },
		{ accessorKey: 'hidden', header: 'Hidden' },
		{ id: 'shout', header: 'Shout', exportValue: (row) => row.name.toUpperCase() }
	];
	const labels = { yes: 'Ja', no: 'Nein' };

	test('exports accessor and custom columns as text, skipping columns with neither', () => {
		expect(
			tableExport(
				columns,
				[
					{ name: 'a', age: 3, hidden: true },
					{ name: 'b', age: null, hidden: false }
				],
				labels
			)
		).toEqual({
			header: ['Name', 'Age', 'Hidden', 'Shout'],
			data: [
				['a', '3', 'Ja', 'A'],
				['b', '', 'Nein', 'B']
			]
		});
	});
	test('still has its header without rows', () => {
		expect(tableExport(columns, [], labels).header).toEqual(['Name', 'Age', 'Hidden', 'Shout']);
	});
});

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

describe('column visibility', () => {
	const columns: ManagedColumn<{ a: string }>[] = [
		{ accessorKey: 'a', defaultVisible: true },
		{ id: 'email', defaultVisible: false },
		{ id: 'untouched' }
	];

	test('defaults come from the columns that say so', () => {
		expect(defaultColumnVisibility(columns)).toEqual({ a: true, email: false });
	});

	test('a stored visibility wins, no store falls back to the defaults', () => {
		expect(initialColumnVisibility('{"email":true}', columns)).toEqual({ email: true });
		expect(initialColumnVisibility(null, columns)).toEqual(defaultColumnVisibility(columns));
	});

	test('an unreadable store leaves the visibility alone', () => {
		expect(initialColumnVisibility('{broken', columns)).toBeUndefined();
	});
});

describe('URL codecs', () => {
	test('filters keep an empty list apart from a missing one', () => {
		expect(filtersParam.encode([])).toBe('[]');
		expect(filtersParam.decode('[]')).toEqual([]);
		expect(filtersParam.decode(null)).toBeNull();
		expect(filtersParam.decode('nonsense')).toBeNull();
	});

	test('sorting round-trips, `none` being no sorting at all', () => {
		const sorting = [
			{ id: 'family_name', desc: false },
			{ id: 'email', desc: true }
		];
		expect(sortingParam.encode(sorting)).toBe('family_name,-email');
		expect(sortingParam.decode('family_name,-email')).toEqual(sorting);
		expect(sortingParam.encode([])).toBe('none');
		expect(sortingParam.decode('none')).toEqual([]);
		expect(sortingParam.decode(null)).toBeNull();
	});

	test('shown columns round-trip and map to a visibility', () => {
		const columns: ManagedColumn<{ a: string }>[] = [
			{ accessorKey: 'a' },
			{ id: 'b' },
			{ id: 'c' }
		];
		expect(shownColumnsParam.decode(shownColumnsParam.encode(['a', 'c']) ?? null)).toEqual([
			'a',
			'c'
		]);
		expect(shownColumnsParam.decode(null)).toBeNull();
		const visibility = visibilityFromShown(columns, ['a', 'c']);
		expect(visibility).toEqual({ a: true, b: false, c: true });
		expect(shownFromVisibility(columns, visibility)).toEqual(['a', 'c']);
		expect(shownFromVisibility(columns, { b: false })).toEqual(['a', 'c']);
	});

	test('sameSorting compares column by column', () => {
		expect(sameSorting([{ id: 'a', desc: false }], [{ id: 'a', desc: false }])).toBe(true);
		expect(sameSorting([{ id: 'a', desc: false }], [{ id: 'a', desc: true }])).toBe(false);
		expect(sameSorting([], [{ id: 'a', desc: true }])).toBe(false);
	});
});
