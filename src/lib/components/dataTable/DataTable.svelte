<script lang="ts" generics="RowData extends object">
	import SvelteTable, { type TableColumns } from 'svelte-table';
	import { getTableSettings } from './dataTableSettings.svelte';
	import Fuse from 'fuse.js';
	import { m } from '$lib/paraglide/messages';
	import { onMount, untrack, type Snippet } from 'svelte';
	import { page } from '$app/state';
	import DataTableSettingsButton from './DataTableSettingsButton.svelte';
	import PrintHeader from './DataTablePrintHeader.svelte';
	import ExportButton from './DataTableExportButton.svelte';
	import { queryParameters } from 'sveltekit-search-params';
	import { expandKeyOf, soleFilteredRow, toggleExpandedKey } from './dataTableRows';

	interface Props {
		columns: TableColumns<RowData>;
		rows: RowData[];
		enableSearch?: boolean;
		sortBy?: string;
		queryParamKey?: string;
		title?: string;
		showExpandIcon?: boolean;
		expandSingle?: boolean;
		selectOnClick?: boolean;
		rowKey?: string;
		selected?: string[];
		expandedRowContent?: Snippet<[RowData]>;
		additionallyIndexedKeys?: string[];
		rowSelected?: (row: RowData) => void;
		tableClass?: string;
	}

	let {
		columns,
		rows,
		enableSearch = true,
		sortBy = 'family_name',
		queryParamKey,
		showExpandIcon = false,
		expandSingle = false,
		selectOnClick = false,
		rowKey = 'id',
		selected = $bindable([]),
		expandedRowContent,
		additionallyIndexedKeys = [],
		title = page.url.pathname.split('/').pop()!,
		tableClass,
		rowSelected
	}: Props = $props();
	const { getTableSize, getZebra } = getTableSettings();

	const enhancedColumns = $derived(
		columns.map((col) => ({
			...col,
			headerFilterClass: col.filterValue ? 'input py-2' : undefined
		}))
	);

	// The URL key is fixed for a table's lifetime; the search params object cannot follow a change.
	const searchKey = untrack(() => queryParamKey) ?? 'filter';
	const params = queryParameters({ [searchKey]: true });
	let expanded = $state<(string | number)[]>([]);

	const toggleExpanded = (row: RowData) => {
		const rowKey = expandKeyOf(row);
		if (rowKey === undefined) return;
		expanded = toggleExpandedKey(expanded, rowKey, expandSingle);
	};

	const searchableRows = $derived.by(() => {
		return rows.map((row) => {
			const newRow: { __original__: RowData; [key: string]: unknown } = { __original__: row };
			let all = '';
			for (const column of columns) {
				if (column.value) {
					const key = column.key.toString();
					const value = column.value(row);
					newRow[key] = value;
					if (typeof value === 'string') {
						all += ` ${value}`;
					}
				}
			}
			newRow.__search__all = all;
			return newRow;
		});
	});

	let fuse = $derived(
		new Fuse(searchableRows, {
			keys: [
				...columns.map((c) => c.key.toString()),
				'id',
				...additionallyIndexedKeys,
				'__search__all'
			],
			shouldSort: true,
			threshold: 0.4,
			minMatchCharLength: 1,
			useExtendedSearch: true
		})
	);
	let searchedColumns = $derived(
		params[searchKey] != null
			? fuse
					.search({
						$and: params[searchKey]
							.split(' ')
							.filter((p) => p.trim())
							.map((p) => ({ __search__all: p }))
					})
					.map((i) => i.item.__original__)
			: rows
	);

	onMount(() => {
		// we assume that we hit a single result with a filter query key and therefore want
		// this entry to be selected automatically
		const row = soleFilteredRow(searchedColumns, queryParamKey, page.url.searchParams);
		if (row) rowSelected?.(row);
	});

	$effect(() => {
		if (params[searchKey] == '') {
			params[searchKey] = null;
		}
	});
</script>

<div class="flex min-w-0 items-center overflow-x-auto">
	{#if enableSearch}
		<label class="no-print input input-bordered mr-3 flex w-full items-center gap-2">
			<input type="text" class="grow" bind:value={params[searchKey]} placeholder={m.search()} />
			{#if params[searchKey] !== ''}
				<button
					class="btn btn-square btn-ghost btn-sm"
					onclick={() => (params[searchKey] = '')}
					aria-label="Reset search"
				>
					<i class="fa-duotone fa-times"></i>
				</button>
			{:else}
				<i class="fa-duotone fa-magnifying-glass"></i>
			{/if}
		</label>
	{/if}
	<DataTableSettingsButton />
	<ExportButton exportedData={rows} />
</div>

<PrintHeader {title} searchPattern={params[searchKey] ?? ''} />

<div
	class="svelte-table-wrapper mt-4 max-h-[80vh] min-w-0 overflow-x-auto transition-all duration-300 {tableClass}"
>
	<SvelteTable
		columns={enhancedColumns}
		rows={searchedColumns}
		on:clickRow={(e) =>
			expandedRowContent
				? toggleExpanded(e.detail.row)
				: rowSelected
					? rowSelected(e.detail.row)
					: undefined}
		on:clickExpand={(e) => toggleExpanded(e.detail.row)}
		classNameTable="table {getZebra() &&
			!expandedRowContent &&
			'table-zebra'} table-{getTableSize()} table-pin-rows"
		classNameRow="hover:!bg-base-300 cursor-pointer"
		classNameRowExpanded="bg-base-200"
		classNameExpandedContent="shadow-inner ring-1 ring-black/5 bg-base-200 w-full overflow-x-auto"
		iconAsc="<i class='fa-duotone fa-arrow-down-a-z'></i>"
		iconDesc="<i class='fa-duotone fa-arrow-down-z-a'></i>"
		iconSortable="<i class='fa-solid fa-sort'></i>"
		iconExpand="<button class='btn btn-ghost btn-sm btn-square btn-error'><i class='fa-solid fa-chevron-up'></i></button>"
		iconExpanded="<button class='btn btn-ghost btn-sm btn-square btn-primary'><i class='fa-solid fa-chevron-down'></i></button>"
		iconFilterable="<i class='fa-solid fa-filter'></i>"
		classNameRowSelected="bg-accent"
		bind:selected
		{rowKey}
		{selectOnClick}
		{sortBy}
		{expandSingle}
		{showExpandIcon}
		bind:expanded
	>
		<svelte:fragment slot="expanded" let:row>
			{#if expandedRowContent}
				{@render expandedRowContent(row)}
			{/if}
		</svelte:fragment>
	</SvelteTable>
</div>

<style lang="postcss">
	.svelte-table-wrapper :global(> table > tbody > tr) {
		transition-property: all;
		transition-timing-function: var(--tw-ease, var(--default-transition-timing-function));
		--tw-duration: 300ms;
		transition-duration: 300ms;
	}
</style>
