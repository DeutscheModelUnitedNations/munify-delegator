/**
 * What kind of value a data grid column holds. Everything else follows from it: which filter
 * operators a column offers (`operators.ts`), how it sorts, and how its rows can be grouped
 * (`grouping.ts`) - in the browser (`localEngine.ts`) and in the API's SQL alike.
 *
 * Dates are calendar days: a server table's column yields a SQL `date`, a local table's a `Date`
 * or a `YYYY-MM-DD` string, compared by the day it falls on.
 */
export type ColumnType = 'text' | 'number' | 'date' | 'enum' | 'multiEnum' | 'boolean';

/**
 * What the shared logic needs to know about a column; the frontend's `GridColumn` adds how it is
 * shown, the API's table sources how it is computed.
 */
export interface ColumnMeta {
	/** Stable: named in URLs and saved views. Never rename one. */
	id: string;
	type: ColumnType;
	/** `enum` and `multiEnum`: the values, in their natural order (which is also how they sort) */
	options?: readonly string[];
	/** Offered in the filter builder unless false */
	filterable?: boolean;
	/** Sortable unless false */
	sortable?: boolean;
	/** Offered for grouping unless false; a `multiEnum` column never is */
	groupable?: boolean;
}

/** Whether rows can be grouped by the column. */
export function isGroupable(column: ColumnMeta) {
	return column.groupable !== false && column.type !== 'multiEnum';
}

/** Whether the filter builder offers the column. */
export function isFilterable(column: ColumnMeta) {
	return column.filterable !== false;
}

/** Whether the column can be sorted by. */
export function isSortable(column: ColumnMeta) {
	return column.sortable !== false;
}
