import { describe, expect, it } from 'vitest';
import { CASES_TODAY, CONDITION_CASES } from './conditionCases';
import {
	createComparator,
	createRowFilter,
	createSearch,
	queryGroups,
	queryRows,
	type LocalColumn
} from './localEngine';
import type { FilterRoot } from './stateSchema';

type Row = { cell: unknown };

describe('conditions', () => {
	it.each(CONDITION_CASES)(
		'$type $operator $value on $cell → $passes',
		({ type, operator, value, cell, passes }) => {
			const columns: LocalColumn<Row>[] = [{ id: 'c', type, value: (row) => row.cell }];
			const filter: FilterRoot = {
				type: 'group',
				op: 'and',
				items: [{ type: 'condition', column: 'c', operator, value }]
			};
			expect(createRowFilter({ filter, columns, today: CASES_TODAY })({ cell })).toBe(passes);
		}
	);
});

type Person = { name: string; city: string | null; age: number | null; role: string };

const people: Person[] = [
	{ name: 'Ada', city: 'Berlin', age: 17, role: 'MEMBER' },
	{ name: 'Ben', city: 'Hamburg', age: 19, role: 'SUPERVISOR' },
	{ name: 'Cleo', city: null, age: null, role: 'MEMBER' },
	{ name: 'Dan', city: 'Berlin', age: 25, role: 'SINGLE' }
];

const columns: LocalColumn<Person>[] = [
	{ id: 'name', type: 'text', value: (row) => row.name },
	{ id: 'city', type: 'text', value: (row) => row.city },
	{ id: 'age', type: 'number', value: (row) => row.age, searchable: false },
	{
		id: 'role',
		type: 'enum',
		value: (row) => row.role,
		options: ['SINGLE', 'MEMBER', 'SUPERVISOR']
	}
];

const names = (rows: Person[]) => rows.map((row) => row.name);

describe('filter tree', () => {
	it('ignores incomplete conditions and conditions on unknown columns', () => {
		const filter: FilterRoot = {
			type: 'group',
			op: 'and',
			items: [
				{ type: 'condition', column: 'city', operator: 'contains' },
				{ type: 'condition', column: 'secret', operator: 'contains', value: 'x' }
			]
		};
		expect(people.filter(createRowFilter({ filter, columns, today: CASES_TODAY }))).toHaveLength(4);
	});

	it('joins a group by its own connective', () => {
		const filter: FilterRoot = {
			type: 'group',
			op: 'and',
			items: [
				{ type: 'condition', column: 'city', operator: 'equals', value: 'berlin' },
				{
					type: 'group',
					op: 'or',
					items: [
						{ type: 'condition', column: 'age', operator: 'lt', value: 18 },
						{ type: 'condition', column: 'role', operator: 'is', value: 'SINGLE' }
					]
				}
			]
		};
		expect(names(people.filter(createRowFilter({ filter, columns, today: CASES_TODAY })))).toEqual([
			'Ada',
			'Dan'
		]);
	});
});

describe('search', () => {
	it('needs every word somewhere among the searched columns', () => {
		const search = createSearch({ search: 'ber dan', columns });
		expect(names(people.filter(search))).toEqual(['Dan']);
	});

	it('leaves out columns that are not searched', () => {
		expect(names(people.filter(createSearch({ search: '17', columns })))).toEqual([]);
	});
});

describe('sorting', () => {
	it('puts empty values last in either direction', () => {
		const asc = [...people].sort(
			createComparator({ sorting: [{ id: 'age', desc: false }], columns })
		);
		const desc = [...people].sort(
			createComparator({ sorting: [{ id: 'age', desc: true }], columns })
		);
		expect(names(asc)).toEqual(['Ada', 'Ben', 'Dan', 'Cleo']);
		expect(names(desc)).toEqual(['Dan', 'Ben', 'Ada', 'Cleo']);
	});

	it('sorts enums by their options, not their text', () => {
		const sorted = [...people].sort(
			createComparator({
				sorting: [{ id: 'role', desc: false }],
				columns,
				tieBreaker: (a, b) => a.name.localeCompare(b.name)
			})
		);
		expect(names(sorted)).toEqual(['Dan', 'Ada', 'Cleo', 'Ben']);
	});
});

describe('groups', () => {
	const base = {
		rows: people,
		columns,
		search: '',
		today: CASES_TODAY
	};
	const query = {
		filter: { type: 'group' as const, op: 'and' as const, items: [] },
		sorting: [{ id: 'name', desc: false }],
		grouping: [{ column: 'city' }, { column: 'age', step: 10 }]
	};

	it('counts the groups of the top level', () => {
		expect(queryGroups({ ...base, query: { ...query, path: [] } })).toEqual([
			{ value: 'Berlin', count: 2 },
			{ value: 'Hamburg', count: 1 },
			{ value: null, count: 1 }
		]);
	});

	it('counts the groups within a group, in ranges', () => {
		expect(queryGroups({ ...base, query: { ...query, path: ['Berlin'] } })).toEqual([
			{ value: '10', count: 1 },
			{ value: '20', count: 1 }
		]);
	});

	it('lists the rows of a nested group', () => {
		expect(names(queryRows({ ...base, query: { ...query, path: ['Berlin', '20'] } }))).toEqual([
			'Dan'
		]);
	});
});
