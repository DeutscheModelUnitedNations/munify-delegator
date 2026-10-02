export { renderComponent } from './renderHelpers';
export { autoFilterFns, autoSortFns, columnCanGlobalFilter } from './defaults';

// Re-export the official Svelte 5 adapter and the table-core API it builds on
export {
	createTable,
	FlexRender,
	tableFeatures,
	metaHelper,
	rowSortingFeature,
	columnFilteringFeature,
	globalFilteringFeature,
	rowPaginationFeature,
	columnVisibilityFeature,
	columnFacetingFeature,
	createSortedRowModel,
	createFilteredRowModel,
	createPaginatedRowModel,
	createFacetedRowModel,
	createFacetedUniqueValues,
	createFacetedMinMaxValues,
	type ColumnDef,
	type SortingState,
	type PaginationState,
	type ColumnFiltersState,
	type ColumnVisibilityState,
	type FilterFn,
	type TableFeatures,
	type RowData,
	type Table
} from '@tanstack/svelte-table';
