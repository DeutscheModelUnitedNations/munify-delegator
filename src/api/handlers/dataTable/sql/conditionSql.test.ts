import { describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';
import { CASES_TODAY, CONDITION_CASES } from '#lib/dataGrid/conditionCases';
import { conditionSql } from './conditionSql';

const dialect = new PgDialect();
const render = (query: ReturnType<typeof sql>) => dialect.sqlToQuery(query);

describe('conditionSql', () => {
	it.each(CONDITION_CASES)('builds SQL for $type $operator', ({ type, operator, value }) => {
		const built = conditionSql({
			column: { id: 'c', type },
			condition: { type: 'condition', column: 'c', operator, value },
			expr: sql`x`,
			today: CASES_TODAY
		});
		expect(built).toBeDefined();
		// never SQL's unknown: an empty value is false
		expect(render(built!).sql).toMatch(/^coalesce\(\(/);
	});

	it('does not count incomplete conditions or unknown operators', () => {
		const column = { id: 'c', type: 'text' as const };
		const expr = sql`x`;
		expect(
			conditionSql({
				column,
				condition: { type: 'condition', column: 'c', operator: 'contains' },
				expr,
				today: CASES_TODAY
			})
		).toBeUndefined();
		expect(
			conditionSql({
				column,
				condition: { type: 'condition', column: 'c', operator: 'nope', value: 'x' },
				expr,
				today: CASES_TODAY
			})
		).toBeUndefined();
	});

	it('binds text literally, wildcards escaped', () => {
		const built = conditionSql({
			column: { id: 'c', type: 'text' },
			condition: { type: 'condition', column: 'c', operator: 'contains', value: '50%_off' },
			expr: sql`x`,
			today: CASES_TODAY
		});
		expect(render(built!).params).toEqual(['%50\\%\\_off%']);
	});

	it('binds a list of options as one array', () => {
		const built = conditionSql({
			column: { id: 'c', type: 'enum' },
			condition: { type: 'condition', column: 'c', operator: 'anyOf', value: ['A', 'B'] },
			expr: sql`x`,
			today: CASES_TODAY
		});
		expect(render(built!).params).toEqual([['A', 'B']]);
	});
});
