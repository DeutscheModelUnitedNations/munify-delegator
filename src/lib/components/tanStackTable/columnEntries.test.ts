import { describe, expect, test } from 'vitest';
import { filterEntries, groupEntries } from './columnEntries';
import type { ManagedColumn } from './managedTable';

type Row = { name: string };

const column = (
	id: string,
	options: { visible?: boolean; canFilter?: boolean } = {}
): [string, { id: string; getCanFilter(): boolean; getIsVisible(): boolean }] => [
	id,
	{
		id,
		getCanFilter: () => options.canFilter ?? true,
		getIsVisible: () => options.visible ?? true
	}
];

const table = (...columns: ReturnType<typeof column>[]) => {
	const byId = new Map(columns);
	return { getColumn: (id: string) => byId.get(id) };
};

describe('filterEntries', () => {
	test('lists filterable columns with their heading and group', () => {
		const columns: ManagedColumn<Row>[] = [
			{ id: 'name', header: 'Name', group: 'Person', filter: { type: 'text' } }
		];
		const [entry] = filterEntries(columns, table(column('name')));
		expect(entry).toMatchObject({ group: 'Person', header: 'Name', filter: { type: 'text' } });
	});

	test('falls back to the column id as heading', () => {
		const columns: ManagedColumn<Row>[] = [{ id: 'name', filter: { type: 'text' } }];
		expect(filterEntries(columns, table(column('name')))[0].header).toBe('name');
	});

	test('skips columns without a filter, an id, a table column or filtering', () => {
		const columns: ManagedColumn<Row>[] = [
			{ id: 'plain' },
			{ header: 'No id', filter: { type: 'text' } },
			{ id: 'missing', filter: { type: 'text' } },
			{ id: 'locked', filter: { type: 'text' } }
		];
		const lookup = table(column('plain'), column('locked', { canFilter: false }));
		expect(filterEntries(columns, lookup)).toEqual([]);
	});

	test('hidden columns are only offered when always available', () => {
		const columns: ManagedColumn<Row>[] = [
			{ id: 'a', filter: { type: 'text' } },
			{ id: 'b', filter: { type: 'text', alwaysAvailable: true } }
		];
		const lookup = table(column('a', { visible: false }), column('b', { visible: false }));
		expect(filterEntries(columns, lookup).map((entry) => entry.col.id)).toEqual(['b']);
	});
});

describe('groupEntries', () => {
	const entries = [
		{ name: 'a', group: 'Z' },
		{ name: 'b' },
		{ name: 'c', group: 'A' },
		{ name: 'd', group: 'Z' },
		{ name: 'e', group: 'Other' }
	];

	test('ungrouped entries come first, groups keep their entries in order', () => {
		const grouped = groupEntries(entries);
		expect(grouped.map(([heading]) => heading)).toEqual([undefined, 'Z', 'A', 'Other']);
		expect(grouped[1][1].map((entry) => entry.name)).toEqual(['a', 'd']);
	});

	test('listed headings follow their order, the rest after', () => {
		const grouped = groupEntries(entries, ['A', 'Z']);
		expect(grouped.map(([heading]) => heading)).toEqual([undefined, 'A', 'Z', 'Other']);
	});
});
