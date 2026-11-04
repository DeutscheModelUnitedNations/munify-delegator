import { isFilterable, type ColumnMeta } from './columnTypes';
import { dateTest, dayOf, dayPasses } from './dateConditions';
import { groupValueOf, type GroupCount } from './grouping';
import { findOperator, isComplete, numberBounds, optionList } from './operators';
import type {
	Connective,
	DataQuery,
	FilterCondition,
	FilterItem,
	FilterRoot,
	Sorting
} from './stateSchema';

/**
 * The engine for tables held in the browser (a parsed import file, the seat overview): search,
 * filter, sort, group and page an array of rows. It means the same as the API's SQL engine, so a
 * local table and a server table behave alike; `localEngine.test.ts` and the API's
 * `conditionSql.test.ts` check the same cases.
 */

/** A column the local engine can read: its metadata and the value a row has. */
export interface LocalColumn<Row> extends ColumnMeta {
	value: (row: Row) => unknown;
	/** Takes part in the free-text search (every column with a text does, unless false) */
	searchable?: boolean;
	/** The text the search sees; the value's text where left out */
	searchText?: (row: Row) => string;
}

const isEmpty = (value: unknown) =>
	value === null ||
	value === undefined ||
	(typeof value === 'string' && value.trim() === '') ||
	(Array.isArray(value) && value.length === 0);

const text = (value: unknown) => (isEmpty(value) ? '' : String(value).trim().toLowerCase());
const num = (value: unknown) =>
	typeof value === 'number' && Number.isFinite(value) ? value : null;
const list = (value: unknown) => optionList(value);

type Test = (value: unknown, wanted: unknown, today: string) => boolean;

const EMPTY_TESTS: Record<string, Test> = {
	empty: (value) => isEmpty(value),
	notEmpty: (value) => !isEmpty(value)
};

const TEXT: Record<string, Test> = {
	contains: (v, w) => text(v).includes(text(w)),
	notContains: (v, w) => !text(v).includes(text(w)),
	equals: (v, w) => text(v) === text(w),
	notEquals: (v, w) => text(v) !== text(w),
	startsWith: (v, w) => text(v).startsWith(text(w)),
	endsWith: (v, w) => text(v).endsWith(text(w)),
	...EMPTY_TESTS
};

const compare =
	(fn: (a: number, b: number) => boolean): Test =>
	(v, w) => {
		const value = num(v);
		const wanted = num(w);
		return value !== null && wanted !== null && fn(value, wanted);
	};

const NUMBER: Record<string, Test> = {
	eq: compare((a, b) => a === b),
	neq: compare((a, b) => a !== b),
	gt: compare((a, b) => a > b),
	gte: compare((a, b) => a >= b),
	lt: compare((a, b) => a < b),
	lte: compare((a, b) => a <= b),
	between: (v, w) => {
		const value = num(v);
		const { from, to } = numberBounds(w);
		return (
			value !== null && (from === undefined || value >= from) && (to === undefined || value <= to)
		);
	},
	...EMPTY_TESTS
};

const option = (value: unknown) => (isEmpty(value) ? null : String(value));

const ENUM: Record<string, Test> = {
	is: (v, w) => option(v) === w,
	isNot: (v, w) => option(v) !== w,
	anyOf: (v, w) => {
		const value = option(v);
		return value !== null && list(w).includes(value);
	},
	noneOf: (v, w) => {
		const value = option(v);
		return value === null || !list(w).includes(value);
	},
	...EMPTY_TESTS
};

const MULTI_ENUM: Record<string, Test> = {
	hasAny: (v, w) => list(w).some((item) => list(v).includes(item)),
	hasAll: (v, w) => list(w).every((item) => list(v).includes(item)),
	hasNone: (v, w) => !list(w).some((item) => list(v).includes(item)),
	...EMPTY_TESTS
};

const BOOLEAN: Record<string, Test> = {
	isTrue: (v) => v === true,
	isFalse: (v) => v !== true
};

const TESTS: Record<Exclude<ColumnMeta['type'], 'date'>, Record<string, Test>> = {
	text: TEXT,
	number: NUMBER,
	enum: ENUM,
	multiEnum: MULTI_ENUM,
	boolean: BOOLEAN
};

/**
 * Whether a row's value passes a condition; `undefined` when the condition does not count
 * (incomplete, or on a column the table does not have).
 */
function conditionPasses<Row>({
	row,
	condition,
	columns,
	today
}: {
	row: Row;
	condition: FilterCondition;
	columns: ReadonlyMap<string, LocalColumn<Row>>;
	today: string;
}): boolean | undefined {
	const column = columns.get(condition.column);
	if (!column || !isFilterable(column)) return undefined;
	const operator = findOperator({ type: column.type, id: condition.operator });
	if (!operator || !isComplete({ input: operator.input, value: condition.value })) return undefined;
	const value = column.value(row);
	if (column.type === 'date') {
		const test = dateTest({ operator: operator.id, value: condition.value, today });
		return test ? dayPasses({ day: dayOf(value), test }) : undefined;
	}
	const tests = TESTS[column.type];
	return Object.hasOwn(tests, operator.id)
		? tests[operator.id](value, condition.value, today)
		: undefined;
}

/** AND or OR over the results that count; `undefined` when none does. */
function combine({ op, results }: { op: Connective; results: (boolean | undefined)[] }) {
	const decided = results.filter((result) => result !== undefined);
	if (decided.length === 0) return undefined;
	return op === 'and' ? decided.every(Boolean) : decided.some(Boolean);
}

/** A row filter for a whole filter tree; columns are looked up once, not per row. */
export function createRowFilter<Row>({
	filter,
	columns,
	today
}: {
	filter: FilterRoot;
	columns: readonly LocalColumn<Row>[];
	today: string;
}) {
	const lookup = new Map(columns.map((column) => [column.id, column]));
	const passes = (row: Row, condition: FilterCondition) =>
		conditionPasses({ row, condition, columns: lookup, today });
	const item = (row: Row, entry: FilterItem) =>
		entry.type === 'condition'
			? passes(row, entry)
			: combine({ op: entry.op, results: entry.items.map((inner) => passes(row, inner)) });
	return (row: Row) =>
		combine({ op: filter.op, results: filter.items.map((entry) => item(row, entry)) }) ?? true;
}

/** The free-text search: every word has to occur in one of the searched columns, any of them. */
export function createSearch<Row>({
	search,
	columns
}: {
	search: string;
	columns: readonly LocalColumn<Row>[];
}) {
	const terms = search.trim().toLowerCase().split(/\s+/).filter(Boolean);
	if (terms.length === 0) return () => true;
	const searched = columns.filter((column) => column.searchable !== false);
	return (row: Row) => {
		const haystack = searched
			.map((column) => column.searchText?.(row) ?? text(column.value(row)))
			.join(' ')
			.toLowerCase();
		return terms.every((term) => haystack.includes(term));
	};
}

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

type SortKey = string | number | null;

function sortKey<Row>({ column, row }: { column: LocalColumn<Row>; row: Row }): SortKey {
	const value = column.value(row);
	if (isEmpty(value)) return null;
	switch (column.type) {
		case 'date':
			return dayOf(value);
		case 'boolean':
			return value ? 1 : 0;
		case 'number':
			return num(value);
		case 'enum': {
			const index = column.options?.indexOf(String(value)) ?? -1;
			return index === -1 ? String(value) : index;
		}
		case 'multiEnum':
			return list(value).join(', ');
		default:
			return String(value);
	}
}

function compareKeys(a: string | number, b: string | number) {
	if (typeof a === 'number' && typeof b === 'number') return a - b;
	return collator.compare(String(a), String(b));
}

/**
 * A comparator for the sorting. Empty values come last in either direction: a list sorted by date
 * descending starts with the latest date, not with the rows without one.
 */
export function createComparator<Row>({
	sorting,
	columns,
	tieBreaker
}: {
	sorting: Sorting;
	columns: readonly LocalColumn<Row>[];
	tieBreaker?: (a: Row, b: Row) => number;
}) {
	const lookup = new Map(columns.map((column) => [column.id, column]));
	const active = sorting.flatMap(({ id, desc }) => {
		const column = lookup.get(id);
		return column ? [{ column, desc }] : [];
	});
	return (a: Row, b: Row) => {
		for (const { column, desc } of active) {
			const left = sortKey({ column, row: a });
			const right = sortKey({ column, row: b });
			if (left === null && right === null) continue;
			if (left === null) return 1;
			if (right === null) return -1;
			const result = compareKeys(left, right);
			if (result !== 0) return desc ? -result : result;
		}
		return tieBreaker?.(a, b) ?? 0;
	};
}

/** Whether a row lies in the group `path` names, level by level. */
function inGroup<Row>({
	row,
	query,
	lookup
}: {
	row: Row;
	query: DataQuery;
	lookup: ReadonlyMap<string, LocalColumn<Row>>;
}) {
	return query.path.every((wanted, level) => {
		const groupBy = query.grouping[level];
		const column = groupBy && lookup.get(groupBy.column);
		if (!column) return true;
		return groupValueOf({ column, groupBy, value: column.value(row) }) === wanted;
	});
}

export interface LocalSourceInput<Row> {
	rows: readonly Row[];
	columns: readonly LocalColumn<Row>[];
	query: DataQuery;
	search: string;
	today: string;
	tieBreaker?: (a: Row, b: Row) => number;
}

/** The rows a query asks for, searched, filtered, within its group and sorted; not paged. */
export function queryRows<Row>({
	rows,
	columns,
	query,
	search,
	today,
	tieBreaker
}: LocalSourceInput<Row>): Row[] {
	const lookup = new Map(columns.map((column) => [column.id, column]));
	const matchesSearch = createSearch({ search, columns });
	const matchesFilter = createRowFilter({ filter: query.filter, columns, today });
	return rows
		.filter((row) => matchesSearch(row) && matchesFilter(row) && inGroup({ row, query, lookup }))
		.sort(createComparator({ sorting: query.sorting, columns, tieBreaker }));
}

/** The groups of the level below `query.path`, with how many rows each holds (unordered). */
export function queryGroups<Row>(input: LocalSourceInput<Row>): GroupCount[] {
	const level = input.query.path.length;
	const groupBy = input.query.grouping[level];
	const column = groupBy && input.columns.find((candidate) => candidate.id === groupBy.column);
	if (!groupBy || !column) return [];
	const counts = new Map<string | null, number>();
	for (const row of queryRows(input)) {
		const value = groupValueOf({ column, groupBy, value: column.value(row) });
		counts.set(value, (counts.get(value) ?? 0) + 1);
	}
	return [...counts].map(([value, count]) => ({ value, count }));
}
