import {
	autoFilterFns,
	autoSortFns,
	columnFilteringFeature,
	columnVisibilityFeature,
	createFilteredRowModel,
	createPaginatedRowModel,
	createSortedRowModel,
	globalFilteringFeature,
	rowPaginationFeature,
	rowSortingFeature,
	tableFeatures,
	type ColumnDef
} from '$lib/components/tanStackTable';

/** Everything `ManagedTable` uses, and the row models that implement it. */
export const managedTableFeatures = tableFeatures({
	rowSortingFeature,
	columnFilteringFeature,
	globalFilteringFeature,
	rowPaginationFeature,
	columnVisibilityFeature,
	sortedRowModel: createSortedRowModel(),
	filteredRowModel: createFilteredRowModel(),
	paginatedRowModel: createPaginatedRowModel(),
	filterFns: autoFilterFns,
	sortFns: autoSortFns
});

export type ManagedTableFeatures = typeof managedTableFeatures;

/** A column of a `ManagedTable`. Its accessor is what gets sorted and searched. */
export type ManagedColumn<TData extends object> = ColumnDef<ManagedTableFeatures, TData>;

/**
 * The one row a filter from the URL narrowed the table down to, which the table then selects on
 * its own; `undefined` unless the filter is set and matched exactly one row.
 */
export function soleFilteredRow<R>(
	rows: readonly R[],
	queryParamKey: string | undefined,
	searchParams: URLSearchParams
): R | undefined {
	if (rows.length !== 1 || !queryParamKey) return undefined;
	return searchParams.get(queryParamKey) ? rows[0] : undefined;
}
