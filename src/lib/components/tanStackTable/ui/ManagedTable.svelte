<script lang="ts" generics="TData extends object">
	import { onMount, untrack } from 'svelte';
	import { page } from '$app/state';
	import { queryParameters } from 'sveltekit-search-params';
	import { m } from '$lib/paraglide/messages';
	import {
		createTable,
		createFuzzySearch,
		rowSearchText,
		type PaginationState,
		type SortingState
	} from '$lib/components/tanStackTable';
	import {
		managedTableFeatures,
		soleFilteredRow,
		type ManagedColumn
	} from '$lib/components/tanStackTable/managedTable';
	import { DataTable } from '$lib/components/tanStackTable/ui';
	import SortableTable from './SortableTable.svelte';
	import ExportButton from '../toolbar/ExportButton.svelte';
	import PrintHeader from '../toolbar/PrintHeader.svelte';
	import SettingsButton from '../toolbar/SettingsButton.svelte';
	import { getTableSettings } from '../toolbar/tableSettings.svelte';

	/**
	 * The table of the management pages: a sortable, paginated table with a search box kept in the
	 * URL, an export button and the size / zebra settings. Search is fuzzy (Fuse) and matches across
	 * all columns, using what each column's accessor returns.
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
		pageSize = 50
	}: Props = $props();

	const { getTableSize, getZebra } = getTableSettings();

	// The URL key is fixed for a table's lifetime; the search params object cannot follow a change.
	const searchKey = untrack(() => queryParamKey) ?? 'filter';
	const urlParams = queryParameters({ [searchKey]: true });

	// svelte-ignore state_referenced_locally
	let sorting = $state<SortingState>(initialSorting);
	// svelte-ignore state_referenced_locally
	let pagination = $state<PaginationState>({ pageIndex: 0, pageSize });
	const globalFilter = $derived(urlParams[searchKey] ?? '');

	const searchRows = $derived(
		createFuzzySearch(rows, (row, index) => rowSearchText(columns, row, index))
	);
	/** The rows matching the search, best match first; every row without one. */
	const searchedRows = $derived(searchRows(globalFilter));

	const table = createTable({
		features: managedTableFeatures,
		get data() {
			return [...searchedRows];
		},
		get columns() {
			return columns;
		},
		state: {
			get sorting() {
				return sorting;
			},
			get pagination() {
				return pagination;
			}
		},
		onSortingChange: (updater) => {
			sorting = typeof updater === 'function' ? updater(sorting) : updater;
		},
		onPaginationChange: (updater) => {
			pagination = typeof updater === 'function' ? updater(pagination) : updater;
		}
	});

	function setSearch(value: string) {
		urlParams[searchKey] = value === '' ? null : value;
		pagination = { ...pagination, pageIndex: 0 };
	}

	onMount(() => {
		// a filter that narrows the table down to one row, as links from elsewhere do, opens that row
		const row = soleFilteredRow(searchedRows, queryParamKey, page.url.searchParams);
		if (row) onRowClick?.(row);
	});
</script>

<div class="flex min-w-0 items-center gap-2">
	{#if enableSearch}
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
	{:else}
		<div class="grow"></div>
	{/if}
	<span class="text-base-content/60 text-sm whitespace-nowrap">
		{searchedRows.length} / {rows.length}
	</span>
	<SettingsButton />
	<ExportButton exportedData={[...searchedRows]} />
</div>

<PrintHeader {title} searchPattern={globalFilter} />

<div class="mt-4 min-w-0">
	<SortableTable
		{table}
		{onRowClick}
		{isRowSelected}
		{columnClasses}
		class="{getZebra() ? 'table-zebra' : ''} table-{getTableSize()}"
	/>
	<DataTable.Pagination {table} />
</div>
