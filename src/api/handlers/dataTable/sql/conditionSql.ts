import { sql, type SQL } from 'drizzle-orm';
import type { ColumnMeta, ColumnType } from '#lib/dataGrid/columnTypes';
import { dateTest } from '#lib/dataGrid/dateConditions';
import { findOperator, isComplete, numberBounds, optionList } from '#lib/dataGrid/operators';
import type { FilterCondition } from '#lib/dataGrid/stateSchema';
import { escapeLike } from '../source';

/**
 * One filter condition as SQL, meaning what `#lib/dataGrid/localEngine` means in the browser (both
 * are tested against `CONDITION_CASES`). Every condition is wrapped in `coalesce(…, false)`, so an
 * empty value yields false rather than SQL's unknown, which would turn an OR into nothing.
 */

type Build = (args: { expr: SQL; value: unknown }) => SQL | undefined;

const like = (pattern: string) => sql`${pattern}`;
const textOf = (expr: SQL) => sql`lower(btrim(coalesce(${expr}, '')))`;
const wanted = (value: unknown) => String(value).trim().toLowerCase();
const isEmptyText = (expr: SQL) => sql`(${expr} is null or btrim(${expr}) = '')`;

const TEXT: Record<string, Build> = {
	contains: ({ expr, value }) =>
		sql`${textOf(expr)} like ${like(`%${escapeLike(wanted(value))}%`)}`,
	notContains: ({ expr, value }) =>
		sql`${textOf(expr)} not like ${like(`%${escapeLike(wanted(value))}%`)}`,
	equals: ({ expr, value }) => sql`${textOf(expr)} = ${wanted(value)}`,
	notEquals: ({ expr, value }) => sql`${textOf(expr)} <> ${wanted(value)}`,
	startsWith: ({ expr, value }) =>
		sql`${textOf(expr)} like ${like(`${escapeLike(wanted(value))}%`)}`,
	endsWith: ({ expr, value }) => sql`${textOf(expr)} like ${like(`%${escapeLike(wanted(value))}`)}`,
	empty: ({ expr }) => isEmptyText(expr),
	notEmpty: ({ expr }) => sql`not ${isEmptyText(expr)}`
};

const compare =
	(operator: SQL): Build =>
	({ expr, value }) =>
		sql`${expr} ${operator} ${Number(value)}`;

const NUMBER: Record<string, Build> = {
	eq: compare(sql`=`),
	neq: compare(sql`<>`),
	gt: compare(sql`>`),
	gte: compare(sql`>=`),
	lt: compare(sql`<`),
	lte: compare(sql`<=`),
	between: ({ expr, value }) => {
		const { from, to } = numberBounds(value);
		const bounds = [
			...(from !== undefined ? [sql`${expr} >= ${from}`] : []),
			...(to !== undefined ? [sql`${expr} <= ${to}`] : [])
		];
		return bounds.length > 0 ? sql.join(bounds, sql` and `) : undefined;
	},
	empty: ({ expr }) => sql`${expr} is null`,
	notEmpty: ({ expr }) => sql`${expr} is not null`
};

const isEmptyOption = (expr: SQL) => sql`(${expr} is null or ${expr} = '')`;
// a JS array in `sql` is spread into a list; `sql.param` binds it as one array
const optionsArray = (value: unknown) => sql`${sql.param(optionList(value))}::text[]`;

const ENUM: Record<string, Build> = {
	is: ({ expr, value }) => sql`${expr} = ${String(value)}`,
	isNot: ({ expr, value }) => sql`(${isEmptyOption(expr)} or ${expr} <> ${String(value)})`,
	anyOf: ({ expr, value }) => sql`${expr} = any(${optionsArray(value)})`,
	noneOf: ({ expr, value }) =>
		sql`(${isEmptyOption(expr)} or ${expr} <> all(${optionsArray(value)}))`,
	empty: ({ expr }) => isEmptyOption(expr),
	notEmpty: ({ expr }) => sql`not ${isEmptyOption(expr)}`
};

const MULTI_ENUM: Record<string, Build> = {
	hasAny: ({ expr, value }) => sql`${expr} && ${optionsArray(value)}`,
	hasAll: ({ expr, value }) => sql`${expr} @> ${optionsArray(value)}`,
	hasNone: ({ expr, value }) => sql`not coalesce(${expr} && ${optionsArray(value)}, false)`,
	empty: ({ expr }) => sql`coalesce(cardinality(${expr}), 0) = 0`,
	notEmpty: ({ expr }) => sql`coalesce(cardinality(${expr}), 0) > 0`
};

const BOOLEAN: Record<string, Build> = {
	isTrue: ({ expr }) => sql`${expr} is true`,
	isFalse: ({ expr }) => sql`${expr} is not true`
};

const BUILDERS: Record<Exclude<ColumnType, 'date'>, Record<string, Build>> = {
	text: TEXT,
	number: NUMBER,
	enum: ENUM,
	multiEnum: MULTI_ENUM,
	boolean: BOOLEAN
};

function dateSql({
	expr,
	operator,
	value,
	today
}: {
	expr: SQL;
	operator: string;
	value: unknown;
	today: string;
}): SQL | undefined {
	const test = dateTest({ operator, value, today });
	if (!test) return undefined;
	// a timestamp column compares by the day it falls on
	const day = sql`(${expr})::date`;
	switch (test.kind) {
		case 'empty':
			return sql`${expr} is null`;
		case 'notEmpty':
			return sql`${expr} is not null`;
		case 'month':
			return sql`extract(month from ${day}) = ${test.month}`;
		case 'span': {
			const bounds = [
				sql`${expr} is not null`,
				...(test.from ? [sql`${day} >= ${test.from}::date`] : []),
				...(test.to ? [sql`${day} <= ${test.to}::date`] : [])
			];
			return sql.join(bounds, sql` and `);
		}
	}
}

/**
 * The SQL of a condition on `column` (whose value is `expr`), or `undefined` when the condition
 * does not count: an unknown operator or an incomplete value.
 */
export function conditionSql({
	column,
	condition,
	expr,
	today
}: {
	column: ColumnMeta;
	condition: FilterCondition;
	expr: SQL;
	today: string;
}): SQL | undefined {
	const operator = findOperator({ type: column.type, id: condition.operator });
	if (!operator || !isComplete({ input: operator.input, value: condition.value })) return undefined;
	const built =
		column.type === 'date'
			? dateSql({ expr, operator: operator.id, value: condition.value, today })
			: BUILDERS[column.type][operator.id]?.({ expr, value: condition.value });
	return built ? sql`coalesce((${built}), false)` : undefined;
}
