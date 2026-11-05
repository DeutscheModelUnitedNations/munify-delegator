import { describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';
import type { DataQuery } from '#lib/dataGrid/stateSchema';
import { col, type DataTableSource } from '../source';
import { countStatement, groupsStatement, pageStatement } from './statements';

const dialect = new PgDialect();
const render = (query: ReturnType<typeof sql>) => dialect.sqlToQuery(query);

const source: DataTableSource = {
	key: 'schools',
	columns: [
		{ id: 'name', type: 'text' },
		{ id: 'size', type: 'number' },
		{ id: 'kind', type: 'enum', options: ['B', 'A'] },
		{ id: 'tags', type: 'multiEnum' }
	],
	rows: ({ uses }) => sql`select 1 as id ${uses.has('size') ? sql`/* size */` : sql``}`,
	search: (term) => sql`${col('name')} ilike ${term}`,
	tieBreak: [{ id: 'name', desc: false }]
};

const query: DataQuery = {
	filter: { type: 'group', op: 'and', items: [] },
	sorting: [],
	grouping: [],
	path: []
};

const input = (overrides: Partial<DataQuery> = {}, search = '') => ({
	source,
	conferenceId: 'c',
	access: { teamDetails: false },
	query: { ...query, ...overrides },
	search,
	today: '2026-01-01'
});

describe('pageStatement', () => {
	it('asks one row more than the page, ordered stably', () => {
		const { sql: text, params } = render(pageStatement({ input: input(), limit: 20, offset: 40 }));
		expect(text).toContain(
			'order by lower(nullif(btrim(t."name"), \'\')) asc nulls last, t.id asc'
		);
		expect(params.slice(-2)).toEqual([21, 40]);
		expect(text).not.toContain('where');
	});

	it('sorts enums by their options and tells the source what it uses', () => {
		const { sql: text } = render(
			pageStatement({
				input: input({
					sorting: [
						{ id: 'size', desc: true },
						{ id: 'kind', desc: false }
					]
				}),
				limit: 1,
				offset: 0
			})
		);
		expect(text).toContain('/* size */');
		expect(text).toContain('array_position(');
		expect(text.indexOf('t."size" desc')).toBeLessThan(text.indexOf('array_position('));
	});

	it('skips sorting by unknown columns, and filters by the search and the group', () => {
		const { sql: text, params } = render(
			pageStatement({
				input: input(
					{ sorting: [{ id: 'gone', desc: true }], grouping: [{ column: 'kind' }], path: ['A'] },
					'x'
				),
				limit: 1,
				offset: 0
			})
		);
		expect(text).not.toContain('gone');
		expect(text).toContain('t."name" ilike');
		expect(text).toContain('nullif(t."kind"::text, \'\') =');
		expect(params).toContain('A');
	});
});

describe('groupsStatement', () => {
	it('lists the level below the path', () => {
		const grouped = input({
			grouping: [{ column: 'kind' }, { column: 'size', step: 10 }],
			path: ['A']
		});
		const { sql: text } = render(groupsStatement(grouped)!);
		expect(text).toContain('floor(t."size"::float8 /');
		expect(text).toContain('group by 1');
	});

	it('has nothing below the last level, and never groups by a multi-enum', () => {
		expect(groupsStatement(input({ grouping: [{ column: 'kind' }], path: ['A'] }))).toBeUndefined();
		expect(groupsStatement(input({ grouping: [{ column: 'tags' }] }))).toBeUndefined();
	});
});

describe('countStatement', () => {
	it('counts with the filter', () => {
		const { sql: text } = render(
			countStatement(
				input({
					filter: {
						type: 'group',
						op: 'or',
						items: [
							{ type: 'condition', column: 'size', operator: 'gt', value: 3 },
							{ type: 'condition', column: 'size', operator: 'gt' }
						]
					}
				})
			)
		);
		expect(text).toMatch(/^select count\(\*\)::int as total from \(select 1 as id/);
		expect(text).toContain('(coalesce((t."size" > $');
	});
});
