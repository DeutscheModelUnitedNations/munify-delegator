import type { ColumnType } from './columnTypes';
import type { FilterCondition } from './stateSchema';

/**
 * What each operator means, as cases both engines are tested against: the browser's
 * (`localEngine.test.ts`) and the database's (the API's `conditionSql.db.test.ts`, which runs them
 * in Postgres). `today` is fixed at 2026-06-15. A cell of `null` is an empty value.
 */
export const CASES_TODAY = '2026-06-15';

export interface ConditionCase {
	type: ColumnType;
	operator: string;
	value?: FilterCondition['value'];
	cell: string | number | boolean | readonly string[] | null;
	passes: boolean;
}

export const CONDITION_CASES: readonly ConditionCase[] = [
	{ type: 'text', operator: 'contains', value: 'ber', cell: 'Berlin', passes: true },
	{ type: 'text', operator: 'contains', value: 'ber', cell: 'Hamburg', passes: false },
	{ type: 'text', operator: 'notContains', value: 'ber', cell: 'Hamburg', passes: true },
	{ type: 'text', operator: 'notContains', value: 'ber', cell: null, passes: true },
	{ type: 'text', operator: 'equals', value: 'berlin', cell: 'Berlin', passes: true },
	{ type: 'text', operator: 'notEquals', value: 'berlin', cell: null, passes: true },
	{ type: 'text', operator: 'startsWith', value: 'ham', cell: 'Hamburg', passes: true },
	{ type: 'text', operator: 'endsWith', value: 'burg', cell: 'Hamburg', passes: true },
	{ type: 'text', operator: 'contains', value: '50%', cell: '50% off', passes: true },
	{ type: 'text', operator: 'contains', value: '50%', cell: '500 off', passes: false },
	{ type: 'text', operator: 'empty', cell: '', passes: true },
	{ type: 'text', operator: 'empty', cell: null, passes: true },
	{ type: 'text', operator: 'notEmpty', cell: 'x', passes: true },
	{ type: 'number', operator: 'eq', value: 3, cell: 3, passes: true },
	{ type: 'number', operator: 'neq', value: 3, cell: 4, passes: true },
	{ type: 'number', operator: 'neq', value: 3, cell: null, passes: false },
	{ type: 'number', operator: 'gt', value: 3, cell: 4, passes: true },
	{ type: 'number', operator: 'gte', value: 3, cell: 3, passes: true },
	{ type: 'number', operator: 'lt', value: 3, cell: 3, passes: false },
	{ type: 'number', operator: 'lte', value: 3, cell: 3, passes: true },
	{ type: 'number', operator: 'between', value: { from: 16, to: 18 }, cell: 17, passes: true },
	{ type: 'number', operator: 'between', value: { from: 16 }, cell: 30, passes: true },
	{ type: 'number', operator: 'between', value: { to: 16 }, cell: 30, passes: false },
	{ type: 'number', operator: 'empty', cell: null, passes: true },
	{ type: 'date', operator: 'on', value: '2026-06-15', cell: '2026-06-15', passes: true },
	{ type: 'date', operator: 'before', value: '2026-06-15', cell: '2026-06-15', passes: false },
	{ type: 'date', operator: 'before', value: '2026-06-15', cell: '2026-06-14', passes: true },
	{ type: 'date', operator: 'after', value: '2026-06-15', cell: '2026-06-16', passes: true },
	{ type: 'date', operator: 'after', value: '2026-06-15', cell: null, passes: false },
	{
		type: 'date',
		operator: 'between',
		value: { from: '2026-01-01', to: '2026-01-31' },
		cell: '2026-01-31',
		passes: true
	},
	{
		type: 'date',
		operator: 'inLast',
		value: { amount: 3, unit: 'months' },
		cell: '2026-03-15',
		passes: true
	},
	{
		type: 'date',
		operator: 'inLast',
		value: { amount: 3, unit: 'months' },
		cell: '2026-03-14',
		passes: false
	},
	{
		type: 'date',
		operator: 'inNext',
		value: { amount: 10, unit: 'days' },
		cell: '2026-06-25',
		passes: true
	},
	{
		type: 'date',
		operator: 'olderThan',
		value: { amount: 1, unit: 'years' },
		cell: '2025-06-14',
		passes: true
	},
	{
		type: 'date',
		operator: 'olderThan',
		value: { amount: 1, unit: 'years' },
		cell: '2025-06-15',
		passes: false
	},
	{ type: 'date', operator: 'thisYear', cell: '2026-12-31', passes: true },
	{ type: 'date', operator: 'lastYear', cell: '2025-01-01', passes: true },
	{ type: 'date', operator: 'thisMonth', cell: '2026-06-30', passes: true },
	{ type: 'date', operator: 'thisMonth', cell: '2026-07-01', passes: false },
	{ type: 'date', operator: 'month', value: 6, cell: '1999-06-02', passes: true },
	{ type: 'date', operator: 'empty', cell: null, passes: true },
	{ type: 'enum', operator: 'is', value: 'DONE', cell: 'DONE', passes: true },
	{ type: 'enum', operator: 'isNot', value: 'DONE', cell: null, passes: true },
	{ type: 'enum', operator: 'anyOf', value: ['DONE', 'PROBLEM'], cell: 'PROBLEM', passes: true },
	{ type: 'enum', operator: 'anyOf', value: ['DONE'], cell: null, passes: false },
	{ type: 'enum', operator: 'noneOf', value: ['DONE'], cell: null, passes: true },
	{ type: 'enum', operator: 'noneOf', value: ['DONE'], cell: 'DONE', passes: false },
	{ type: 'multiEnum', operator: 'hasAny', value: ['a', 'b'], cell: ['b', 'c'], passes: true },
	{ type: 'multiEnum', operator: 'hasAll', value: ['a', 'b'], cell: ['b', 'c'], passes: false },
	{ type: 'multiEnum', operator: 'hasNone', value: ['a'], cell: ['b'], passes: true },
	{ type: 'multiEnum', operator: 'empty', cell: [], passes: true },
	{ type: 'boolean', operator: 'isTrue', cell: true, passes: true },
	{ type: 'boolean', operator: 'isFalse', cell: null, passes: true },
	{ type: 'boolean', operator: 'isFalse', cell: true, passes: false }
];
