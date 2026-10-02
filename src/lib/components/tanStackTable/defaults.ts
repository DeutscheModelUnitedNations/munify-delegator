import {
	filterFn_arrIncludes,
	filterFn_equals,
	filterFn_inDateRange,
	filterFn_inNumberRange,
	filterFn_includesString,
	filterFn_weakEquals,
	sortFn_alphanumeric,
	sortFn_basic,
	sortFn_datetime,
	sortFn_text,
	type CellData,
	type Column,
	type RowData,
	type TableFeatures
} from '@tanstack/svelte-table';

/**
 * The built-in filter functions table-core v9 can resolve to, either through
 * `filterFn: 'auto'` on a column or `globalFilterFn: 'includesString'`.
 * v8 bundled every built-in; v9 only resolves what is registered in the
 * `filterFns` slot of `tableFeatures`, so tables register these to keep the
 * v8 behaviour.
 */
export const autoFilterFns = {
	includesString: filterFn_includesString,
	inNumberRange: filterFn_inNumberRange,
	equals: filterFn_equals,
	arrIncludes: filterFn_arrIncludes,
	inDateRange: filterFn_inDateRange,
	weakEquals: filterFn_weakEquals
};

/**
 * The built-in sort functions `sortFn: 'auto'` (the column default) can pick.
 * Register them in the `sortFns` slot of `tableFeatures`, otherwise v9 falls
 * back to `basic` for every column.
 */
export const autoSortFns = {
	alphanumeric: sortFn_alphanumeric,
	text: sortFn_text,
	datetime: sortFn_datetime,
	basic: sortFn_basic
};

/**
 * v8's default for `getColumnCanGlobalFilter`: only columns whose first row
 * holds a string or a number take part in the global search. v9 has no
 * default and would search every accessor column (booleans, dates, …).
 */
export function columnCanGlobalFilter<
	TFeatures extends TableFeatures,
	TData extends RowData,
	TValue extends CellData = CellData
>(column: Column<TFeatures, TData, TValue>): boolean {
	const value = column.table.getCoreRowModel().flatRows[0]?.getValue(column.id);
	return typeof value === 'string' || typeof value === 'number';
}
