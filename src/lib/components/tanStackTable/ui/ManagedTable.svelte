<script lang="ts" generics="TData extends object">
	import { onMount, untrack, type Snippet } from 'svelte';
	import { page } from '$app/state';
	import { queryParameters } from 'sveltekit-search-params';
	import { m } from '$lib/paraglide/messages';
	import {
		createTable,
		createFuzzySearch,
		rowSearchText,
		type ColumnFiltersState,
		type ColumnVisibilityState,
		type SortingState,
		type Table
	} from '$lib/components/tanStackTable';
	import {
		columnIdOf,
		defaultColumnVisibility,
		initialColumnVisibility,
		managedTableFeatures,
		shownColumnsParam,
		shownFromVisibility,
		visibilityFromShown,
		soleFilteredRow,
		tableExport,
		type ManagedColumn,
		type ManagedTableFeatures
	} from '$lib/components/tanStackTable/managedTable';
	import { DataTable } from '$lib/components/tanStackTable/ui';
	import { filterFnFor } from '$lib/components/tanStackTable/filters';
	import {
		createTableState,
		type TableState
	} from '$lib/components/tanStackTable/tableState.svelte';
	import SortableTable from './SortableTable.svelte';
	import ActiveFilters from './ActiveFilters.svelte';
	import ColumnConfigDrawer from './ColumnConfigDrawer.svelte';
	import FilterDrawer from './FilterDrawer.svelte';
	import ExportButton from '../toolbar/ExportButton.svelte';
	import PrintHeader from '../toolbar/PrintHeader.svelte';
	import SettingsButton from '../toolbar/SettingsButton.svelte';

	/**
	 * The table of the management pages: a sortable, paginated table with a search box kept in the
	 * URL, an export button and the size / zebra settings. Search is fuzzy (Fuse) and matches across
	 * the columns named in `searchColumns` (all by default), using what each column's accessor
	 * returns - for tables small enough to hold in the browser. A table of many rows is driven by the
	 * backend instead: the page makes a `createTableState`, queries with its search, sorting,
	 * filters and page, and passes it as `tableState` with just the rows of the page. The table then
	 * searches, sorts, filters and pages nothing itself. Columns that say how they can be
	 * filtered (`filter`) get a filter drawer, active-filter chips and filters kept in the URL
	 * (`?filters=`); every column can be hidden from the column drawer, where `defaultVisible` and
	 * `group` apply and the choice is remembered under `storageKey`.
	 */
	interface Props {
		columns: ManagedColumn<TData>[];
		rows: TData[];
		onRowClick?: (row: TData) => void;
		isRowSelected?: (row: TData) => boolean;
		/** Extra classes for a column's header and cells, by column id */
		columnClasses?: Record<string, string>;
		enableSearch?: boolean;
		/** URL parameter holding the search. A single match for a filter in the URL is clicked. */
		queryParamKey?: string;
		title?: string;
		initialSorting?: SortingState;
		pageSize?: number;
		/**
		 * The filters a table opens with, applied once they are non-empty and the URL holds none.
		 * "Clear all" in the filter drawer returns to them.
		 */
		defaultFilters?: ColumnFiltersState;
		/** Where the shown columns are remembered in the browser; not remembered without it */
		storageKey?: string;
		/** Ids of the columns the search looks at; every column where left out */
		searchColumns?: readonly string[];
		/** Group headings in the order the drawers list them in */
		groupOrder?: string[];
		/**
		 * Hands the table's state to the page and puts the table in server mode: `rows` is only the
		 * current page, already searched, filtered and sorted by the backend.
		 */
		tableState?: TableState;
		/** Server mode: whether the backend has rows after this page (it is asked for one more) */
		hasMore?: boolean;
		/** Server mode: how many rows match in all, when the backend counts them */
		rowCount?: number;
		/**
		 * Server mode: every row matching the current search and filters, for the export (the table
		 * itself only holds one page). The page fetches them from the backend in chunks.
		 */
		exportRows?: () => Promise<TData[]>;
		/** Extra controls in the toolbar row, before the filter and column buttons */
		toolbar?: Snippet<[Table<ManagedTableFeatures, TData>]>;
	}

	let {
		columns,
		rows,
		onRowClick,
		isRowSelected,
		columnClasses,
		enableSearch = true,
		queryParamKey,
		title = page.url.pathname.split('/').pop() ?? '',
		initialSorting = [],
		pageSize = 50,
		defaultFilters,
		storageKey,
		groupOrder,
		searchColumns,
		tableState,
		hasMore = false,
		rowCount,
		exportRows,
		toolbar
	}: Props = $props();

	const serverMode = untrack(() => tableState !== undefined);
	// svelte-ignore state_referenced_locally
	const view: TableState =
		tableState ??
		createTableState({ searchKey: queryParamKey, pageSize, initialSorting, defaultFilters });

	// Everything a viewer can set is kept in the URL, so a copied link shows the same table. The
	// URL key of the search is fixed for a table's lifetime; the search params object cannot follow
	// a change. The state is read off the parameters, with the page's own defaults where a
	// parameter is missing, and written back when the user changes it.
	const params = queryParameters(
		{ columns: shownColumnsParam },
		{ pushHistory: false, showDefaults: false }
	);

	// Client mode searches as the user types; server mode queries once typing has paused
	const globalFilter = $derived(view.typedSearch);
	const sorting = $derived(view.sorting);
	const pagination = $derived(view.pagination);
	const columnFilters = $derived(view.columnFilters);

	// What the columns show without a link saying: what this browser remembered, else the defaults.
	// svelte-ignore state_referenced_locally
	let ownVisibility = $state<ColumnVisibilityState>(defaultColumnVisibility(columns));
	const columnVisibility = $derived<ColumnVisibilityState>(
		params.columns ? visibilityFromShown(columns, params.columns) : ownVisibility
	);
	let filterDrawerOpen = $state(false);
	let columnDrawerOpen = $state(false);

	const hasFilters = $derived(columns.some((column) => column.filter));
	/** The columns with the filter function their kind of filter needs */
	const tableColumns = $derived(
		columns.map((column) =>
			column.filter && !column.filterFn
				? { ...column, filterFn: filterFnFor<TData>(column.filter.type) }
				: column
		)
	);

	$effect(() => {
		if (!storageKey) return;
		const visibility = initialColumnVisibility(localStorage.getItem(storageKey), columns);
		if (visibility) ownVisibility = visibility;
	});

	function setColumnVisibility(state: ColumnVisibilityState) {
		ownVisibility = state;
		if (storageKey) localStorage.setItem(storageKey, JSON.stringify(state));
		const shown = shownFromVisibility(columns, state);
		const defaults = shownFromVisibility(columns, defaultColumnVisibility(columns));
		params.columns = shown.join() === defaults.join() ? null : shown;
	}

	const searchedColumns = $derived(
		searchColumns
			? columns.filter((column) => {
					const id = columnIdOf(column);
					return id !== undefined && searchColumns.includes(id);
				})
			: columns
	);
	const searchRows = $derived(
		serverMode
			? undefined
			: createFuzzySearch(rows, (row, index) => rowSearchText(searchedColumns, row, index))
	);
	/** The rows matching the search, best match first; every row without one. */
	const searchedRows = $derived(searchRows ? searchRows(globalFilter) : rows);

	const table = createTable({
		features: managedTableFeatures,
		get data() {
			return [...searchedRows];
		},
		get columns() {
			return tableColumns;
		},
		manualPagination: serverMode,
		manualSorting: serverMode,
		manualFiltering: serverMode,
		get pageCount() {
			// the backend only says whether there is another page
			if (!serverMode) return undefined;
			if (rowCount !== undefined) return Math.max(Math.ceil(rowCount / pagination.pageSize), 1);
			return pagination.pageIndex + (hasMore ? 2 : 1);
		},
		state: {
			get sorting() {
				return sorting;
			},
			get pagination() {
				return pagination;
			},
			get columnFilters() {
				return columnFilters;
			},
			get columnVisibility() {
				return columnVisibility;
			}
		},
		onSortingChange: (updater) => {
			view.setSorting(typeof updater === 'function' ? updater(sorting) : updater);
		},
		onPaginationChange: (updater) => {
			view.setPagination(typeof updater === 'function' ? updater(pagination) : updater);
		},
		onColumnFiltersChange: (updater) => {
			view.setColumnFilters(typeof updater === 'function' ? updater(columnFilters) : updater);
		},
		onColumnVisibilityChange: (updater) => {
			setColumnVisibility(typeof updater === 'function' ? updater(columnVisibility) : updater);
		}
	});

	const setSearch = (value: string) => view.setSearch(value);

	/** Which rows the table shows: a page's range in server mode, matches of all in client mode */
	const shownRows = $derived.by(() => {
		if (!serverMode) return `${table.getFilteredRowModel().rows.length} / ${rows.length}`;
		const first = pagination.pageIndex * pagination.pageSize;
		const total = rowCount !== undefined ? ` / ${rowCount}` : hasMore ? '+' : '';
		return `${first + 1}–${first + rows.length}${total}`;
	});

	/** What the export contains: the shown columns, for every row the filters let through. */
	async function getExport() {
		const shown = new Set(table.getVisibleLeafColumns().map((column) => column.id));
		return tableExport(
			columns.filter((column) => {
				const id = columnIdOf(column);
				return id === undefined || shown.has(id);
			}),
			exportRows
				? await exportRows()
				: table.getPrePaginatedRowModel().rows.map((row) => row.original),
			{ yes: m.yes(), no: m.no() }
		);
	}

	onMount(() => {
		// a filter that narrows the table down to one row, as links from elsewhere do, opens that row
		const row = soleFilteredRow(searchedRows, queryParamKey, page.url.searchParams);
		if (row) onRowClick?.(row);
	});
</script>

{#snippet searchBox()}
	<label class="no-print input input-bordered flex grow items-center gap-2">
		<input
			type="text"
			class="grow"
			value={globalFilter}
			oninput={(e) => setSearch(e.currentTarget.value)}
			placeholder={m.search()}
		/>
		{#if globalFilter}
			<button
				class="btn btn-square btn-ghost btn-sm"
				aria-label="Clear search"
				onclick={() => setSearch('')}
			>
				<i class="fa-duotone fa-times"></i>
			</button>
		{:else}
			<i class="fa-duotone fa-magnifying-glass"></i>
		{/if}
	</label>
{/snippet}

<div class="flex min-w-0 items-center gap-2">
	{#if enableSearch}
		{@render searchBox()}
	{:else}
		<div class="grow"></div>
	{/if}
	{@render toolbar?.(table)}
	{#if hasFilters}
		<button class="btn btn-ghost btn-sm no-print" onclick={() => (filterDrawerOpen = true)}>
			<i class="fa-duotone fa-filter"></i>
			{m.filters()}
			{#if columnFilters.length > 0}
				<span class="badge badge-primary badge-xs">{columnFilters.length}</span>
			{/if}
		</button>
	{/if}
	<button class="btn btn-ghost btn-sm no-print" onclick={() => (columnDrawerOpen = true)}>
		<i class="fa-duotone fa-columns"></i>
		{m.columns()}
	</button>
	<span class="text-base-content/60 text-sm whitespace-nowrap">{shownRows}</span>
	<SettingsButton />
	<ExportButton filename={title || 'export'} {getExport} />
</div>
{#if hasFilters}
	<ActiveFilters {table} {columns} {columnFilters} />
	<FilterDrawer
		bind:open={filterDrawerOpen}
		{table}
		{columns}
		{groupOrder}
		onResetFilters={() => view.resetFilters()}
	/>
{/if}
<ColumnConfigDrawer
	bind:open={columnDrawerOpen}
	{table}
	{columns}
	{groupOrder}
	onVisibilityChange={setColumnVisibility}
/>

<PrintHeader {title} searchPattern={globalFilter} />

<div class="mt-4 min-w-0">
	<SortableTable {table} {onRowClick} {isRowSelected} {columnClasses} />
	<DataTable.Pagination {table} {serverMode} {rowCount} />
</div>
