import type { ColumnType } from './columnTypes';

/**
 * The filter operators each column type offers, and what value each needs. The meaning of an
 * operator lives twice, once per engine - `localEngine.ts` for tables held in the browser, the
 * API's `conditionSql.ts` for tables the backend filters - and both are tested against the same
 * cases. The labels live in the UI (`operatorLabels.ts`).
 *
 * **Incomplete conditions do not count.** A condition whose value is missing or malformed filters
 * nothing, so someone halfway through building a filter does not see an empty table.
 */

/** How a condition's value is entered, and what shape it has. */
export type ValueInput =
	| 'none'
	| 'text'
	| 'number'
	| 'date'
	| 'numberRange'
	| 'dateRange'
	| 'relative'
	| 'month'
	| 'option'
	| 'options';

export const RELATIVE_UNITS = ['days', 'months', 'years'] as const;
export type RelativeUnit = (typeof RELATIVE_UNITS)[number];

export type Relative = { amount: number; unit: RelativeUnit };

export interface OperatorSpec {
	id: string;
	input: ValueInput;
}

const EMPTY: OperatorSpec = { id: 'empty', input: 'none' };
const NOT_EMPTY: OperatorSpec = { id: 'notEmpty', input: 'none' };

const OPERATORS: Record<ColumnType, readonly OperatorSpec[]> = {
	text: [
		{ id: 'contains', input: 'text' },
		{ id: 'notContains', input: 'text' },
		{ id: 'equals', input: 'text' },
		{ id: 'notEquals', input: 'text' },
		{ id: 'startsWith', input: 'text' },
		{ id: 'endsWith', input: 'text' },
		EMPTY,
		NOT_EMPTY
	],
	number: [
		{ id: 'eq', input: 'number' },
		{ id: 'neq', input: 'number' },
		{ id: 'gt', input: 'number' },
		{ id: 'gte', input: 'number' },
		{ id: 'lt', input: 'number' },
		{ id: 'lte', input: 'number' },
		{ id: 'between', input: 'numberRange' },
		EMPTY,
		NOT_EMPTY
	],
	date: [
		{ id: 'on', input: 'date' },
		{ id: 'before', input: 'date' },
		{ id: 'after', input: 'date' },
		{ id: 'between', input: 'dateRange' },
		{ id: 'inLast', input: 'relative' },
		{ id: 'inNext', input: 'relative' },
		{ id: 'olderThan', input: 'relative' },
		{ id: 'thisYear', input: 'none' },
		{ id: 'lastYear', input: 'none' },
		{ id: 'thisMonth', input: 'none' },
		{ id: 'month', input: 'month' },
		EMPTY,
		NOT_EMPTY
	],
	enum: [
		{ id: 'is', input: 'option' },
		{ id: 'isNot', input: 'option' },
		{ id: 'anyOf', input: 'options' },
		{ id: 'noneOf', input: 'options' },
		EMPTY,
		NOT_EMPTY
	],
	multiEnum: [
		{ id: 'hasAny', input: 'options' },
		{ id: 'hasAll', input: 'options' },
		{ id: 'hasNone', input: 'options' },
		EMPTY,
		NOT_EMPTY
	],
	boolean: [
		{ id: 'isTrue', input: 'none' },
		{ id: 'isFalse', input: 'none' }
	]
};

/** The operators the builder offers for a column type. */
export function operatorsFor(type: ColumnType): readonly OperatorSpec[] {
	return OPERATORS[type];
}

export function findOperator({ type, id }: { type: ColumnType; id: string }) {
	return OPERATORS[type].find((operator) => operator.id === id);
}

/** The operator a newly picked column starts with. */
export function defaultOperator(type: ColumnType) {
	return OPERATORS[type][0].id;
}

const DAY = /^\d{4}-\d{2}-\d{2}$/;

const isFilled = (value: unknown) => value !== undefined && value !== null && value !== '';

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** A range with at least one bound of the right kind; the other may be open. */
function isRange({ value, bound }: { value: unknown; bound: (v: unknown) => boolean }) {
	if (!isRecord(value)) return false;
	const { from, to } = value;
	if (isFilled(from) && !bound(from)) return false;
	if (isFilled(to) && !bound(to)) return false;
	return isFilled(from) || isFilled(to);
}

const isNumber = (value: unknown): value is number =>
	typeof value === 'number' && Number.isFinite(value);
const isDay = (value: unknown): value is string => typeof value === 'string' && DAY.test(value);

export function isRelative(value: unknown): value is Relative {
	if (!isRecord(value)) return false;
	return (
		isNumber(value.amount) &&
		Number.isInteger(value.amount) &&
		value.amount >= 0 &&
		value.amount <= 10_000 &&
		RELATIVE_UNITS.some((unit) => unit === value.unit)
	);
}

const COMPLETE: Record<ValueInput, (value: unknown) => boolean> = {
	none: () => true,
	text: (value) => typeof value === 'string' && value.trim() !== '',
	option: (value) => typeof value === 'string' && value !== '',
	number: isNumber,
	date: isDay,
	numberRange: (value) => isRange({ value, bound: isNumber }),
	dateRange: (value) => isRange({ value, bound: isDay }),
	relative: isRelative,
	month: (value) => isNumber(value) && Number.isInteger(value) && value >= 1 && value <= 12,
	options: (value) =>
		Array.isArray(value) && value.length > 0 && value.every((item) => typeof item === 'string')
};

/** Whether a value is all the operator's input needs. */
export function isComplete({ input, value }: { input: ValueInput; value: unknown }) {
	return COMPLETE[input](value);
}

/** The bounds of a number range, `undefined` for an open end. */
export function numberBounds(value: unknown): { from?: number; to?: number } {
	if (!isRecord(value)) return {};
	return {
		from: isNumber(value.from) ? value.from : undefined,
		to: isNumber(value.to) ? value.to : undefined
	};
}

/** The bounds of a date range (`YYYY-MM-DD`), `undefined` for an open end. */
export function dayBounds(value: unknown): { from?: string; to?: string } {
	if (!isRecord(value)) return {};
	return {
		from: isDay(value.from) ? value.from : undefined,
		to: isDay(value.to) ? value.to : undefined
	};
}

/** The options of a complete `options` value. */
export function optionList(value: unknown): string[] {
	return Array.isArray(value) ? value.filter((item) => typeof item === 'string') : [];
}
