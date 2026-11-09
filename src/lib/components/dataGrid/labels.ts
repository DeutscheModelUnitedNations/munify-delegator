import { m } from '#lib/paraglide/messages';
import type { RelativeUnit } from '#lib/dataGrid/operators';
import type { DateBucket } from '#lib/dataGrid/stateSchema';

/**
 * The words of the grid's menus for the shared model's ids: operators, relative units, date
 * buckets. Kept apart from `#lib/dataGrid`, which the API shares and which has no labels.
 */
const OPERATOR_LABELS: Record<string, () => string> = {
	contains: m.dataGridOpContains,
	notContains: m.dataGridOpNotContains,
	equals: m.dataGridOpIs,
	notEquals: m.dataGridOpIsNot,
	startsWith: m.dataGridOpStartsWith,
	endsWith: m.dataGridOpEndsWith,
	empty: m.dataGridOpEmpty,
	notEmpty: m.dataGridOpNotEmpty,
	eq: () => '=',
	neq: () => '≠',
	gt: () => '>',
	gte: () => '≥',
	lt: () => '<',
	lte: () => '≤',
	between: m.dataGridOpBetween,
	on: m.dataGridOpOn,
	before: m.dataGridOpBefore,
	after: m.dataGridOpAfter,
	inLast: m.dataGridOpInLast,
	inNext: m.dataGridOpInNext,
	olderThan: m.dataGridOpOlderThan,
	thisYear: m.dataGridOpThisYear,
	lastYear: m.dataGridOpLastYear,
	thisMonth: m.dataGridOpThisMonth,
	month: m.dataGridOpMonth,
	is: m.dataGridOpIs,
	isNot: m.dataGridOpIsNot,
	anyOf: m.dataGridOpAnyOf,
	noneOf: m.dataGridOpNoneOf,
	hasAny: m.dataGridOpHasAny,
	hasAll: m.dataGridOpHasAll,
	hasNone: m.dataGridOpHasNone,
	isTrue: m.yes,
	isFalse: m.no
};

export function operatorLabel(id: string) {
	return Object.hasOwn(OPERATOR_LABELS, id) ? OPERATOR_LABELS[id]() : id;
}

export const RELATIVE_UNIT_LABELS: Record<RelativeUnit, () => string> = {
	days: m.dataGridUnitDays,
	months: m.dataGridUnitMonths,
	years: m.dataGridUnitYears
};

export const DATE_BUCKET_LABELS: Record<DateBucket, () => string> = {
	day: m.dataGridBucketDay,
	month: m.dataGridBucketMonth,
	year: m.dataGridBucketYear
};
