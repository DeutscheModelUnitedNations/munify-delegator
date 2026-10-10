import { untrack } from 'svelte';
import { queryParameters, ssp } from 'sveltekit-search-params';
import type {
	ColumnFiltersState,
	PaginationState,
	SortingState
} from '$lib/components/tanStackTable';
import { filtersParam, sameSorting, sortingParam } from './managedTable';

export interface TableStateOptions {
	/** URL parameter holding the search */
	searchKey?: string;
	pageSize?: number;
	initialSorting?: SortingState;
	/** The filters the table opens with; a function where they depend on something loaded later */
	defaultFilters?: ColumnFiltersState | (() => ColumnFiltersState);
	/** How long typing pauses before `search` follows the box; the box itself never lags */
	debounceMs?: number;
}

/** The table's pagination from the `page` (1-based) and `size` parameters. */
function paginationOf(
	page: number | null | undefined,
	size: number | null | undefined,
	pageSize: number
): PaginationState {
	return { pageIndex: Math.max((page ?? 1) - 1, 0), pageSize: size ?? pageSize };
}

/** The filters the table opens with, when the URL holds none. */
function defaultFiltersOf(defaults: TableStateOptions['defaultFilters']): ColumnFiltersState {
	return (typeof defaults === 'function' ? defaults() : defaults) ?? [];
}

/**
 * What a viewer has set on a table - search, sorting, filters, page - kept in the URL so a copied
 * link shows the same table. `ManagedTable` builds one for itself; a page that lets the backend do
 * the work builds it first, reads `search`, `sorting`, `columnFilters` and `pagination` to run its
 * query, and hands it to the table (`tableState`).
 */
export function createTableState({
	searchKey = 'filter',
	pageSize = 50,
	initialSorting = [],
	defaultFilters,
	debounceMs = 250
}: TableStateOptions = {}) {
	const searchParams = queryParameters(
		{ [searchKey]: ssp.string() },
		{ pushHistory: false, showDefaults: false }
	);
	const params = queryParameters(
		{
			filters: filtersParam,
			sort: sortingParam,
			page: ssp.number(),
			size: ssp.number()
		},
		{ pushHistory: false, showDefaults: false }
	);
	const searchInUrl = () => searchParams[searchKey] ?? '';

	/** What is in the search box right now */
	const typedSearch = $derived(searchInUrl());
	let settledSearch = $state(untrack(searchInUrl));
	$effect(() => {
		const next = typedSearch;
		if (next === untrack(() => settledSearch)) return;
		const timer = setTimeout(() => (settledSearch = next), debounceMs);
		return () => clearTimeout(timer);
	});

	// Searching shows the best match first, so it replaces the sorting until one is chosen again
	const defaultSorting = $derived(typedSearch.trim() ? [] : initialSorting);
	const sorting = $derived<SortingState>(params.sort ?? defaultSorting);
	const pagination = $derived(paginationOf(params.page, params.size, pageSize));
	const columnFilters = $derived<ColumnFiltersState>(
		params.filters ?? defaultFiltersOf(defaultFilters)
	);

	return {
		searchKey,
		defaultPageSize: pageSize,
		get typedSearch() {
			return typedSearch;
		},
		/** The search to query with: `typedSearch`, once typing has paused */
		get search() {
			return settledSearch.trim();
		},
		get defaultSorting() {
			return defaultSorting;
		},
		get sorting() {
			return sorting;
		},
		get pagination() {
			return pagination;
		},
		get columnFilters() {
			return columnFilters;
		},
		setSearch(value: string) {
			searchParams[searchKey] = value === '' ? null : value;
			params.sort = null;
			params.page = null;
		},
		setSorting(next: SortingState) {
			params.sort = sameSorting(next, defaultSorting) ? null : next;
		},
		setPagination(next: PaginationState) {
			params.page = next.pageIndex === 0 ? null : next.pageIndex + 1;
			params.size = next.pageSize === pageSize ? null : next.pageSize;
		},
		setColumnFilters(next: ColumnFiltersState) {
			params.filters = next;
			params.page = null;
		},
		resetFilters() {
			params.filters = null;
			params.page = null;
		}
	};
}

export type TableState = ReturnType<typeof createTableState>;
