export { createSvelteTable } from './createSvelteTable.svelte';
export { default as FlexRender } from './FlexRender.svelte';
export { renderComponent, renderSnippet } from './renderHelpers';

// Re-export commonly used types and functions from table-core
export {
	getCoreRowModel,
	getSortedRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	type ColumnDef,
	type SortingState,
	type PaginationState,
	type ColumnFiltersState,
	type TableOptions,
	type Row,
	type Header,
	type Cell,
	type Table
} from '@tanstack/table-core';
