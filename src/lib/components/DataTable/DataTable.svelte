<script lang="ts" generics="RowData">
	import SvelteTable, { type TableColumns } from 'svelte-table';
	import { getTableSettings } from './dataTableSettings.svelte';
	import Fuse from 'fuse.js';
	import { m } from '$lib/paraglide/messages';
	import { onMount, type Snippet } from 'svelte';
	import { page } from '$app/state';
	import DataTableSettingsButton from './DataTableSettingsButton.svelte';
	import PrintHeader from './DataTablePrintHeader.svelte';
	import ExportButton from './DataTableExportButton.svelte';
	import { queryParam } from 'sveltekit-search-params';

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
		filterOptions?: TableColumns<RowData>[number]['key'][];
		additionallyIndexedKeys?: string[];
		rowSelected?: (row: RowData) => void;
		tableClass?: string;
		downloadDescription?: string;
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
		filterOptions,
		additionallyIndexedKeys = [],
		title = page.url.pathname.split('/').pop()!,
		tableClass,
		rowSelected,
		downloadDescription
	}: Props = $props();
	const { getTableSize, getZebra } = getTableSettings();

	const enhancedColumns = $derived(
		columns.map((col) => ({
			...col,
			headerFilterClass: col.filterValue ? 'input py-2' : undefined
		}))
	);

	let searchPattern = queryParam(queryParamKey ?? 'filter');
	let expanded = $state<string[]>([]);

	const toggleExpanded = (row: RowData) => {
		let rowKey = (row as any).rowKey ?? (row as any).id;
		if (expanded.includes(rowKey)) {
			expanded = expanded.filter((r) => r !== rowKey);
		} else {
			if (expandSingle) {
				expanded = [rowKey];
			} else {
				expanded = [...expanded, rowKey];
			}
		}
	};

	const searchableRows = $derived.by(() => {
		return rows.map((row) => {
			const newRow: { [key: string]: any } = { __original__: row };
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
		$searchPattern != null
			? fuse
					.search({
						$and: $searchPattern
							.split(' ')
							.filter((p) => p.trim())
							.map((p) => ({ __search__all: p }))
					})
					.map((i) => i.item.__original__ ?? i.item)
			: rows
	);

	onMount(() => {
		if (
			searchedColumns.length === 1 &&
			queryParamKey &&
			page.url.searchParams.get(queryParamKey) &&
			rowSelected
		) {
			// we assume that we hit a single result with a filter query key and therefore want
			// this entry to be selected automatically
			rowSelected(searchedColumns[0]);
		}
	});

	$effect(() => {
		if ($searchPattern == '') {
			$searchPattern = null;
		}
	});
</script>

<div class="flex min-w-0 items-center overflow-hidden">
	{#if enableSearch}
		<label class="no-print input input-bordered mr-3 flex w-full items-center gap-2">
			<input type="text" class="grow" bind:value={$searchPattern} placeholder={m.search()} />
			{#if $searchPattern !== ''}
				<button
					class="btn btn-square btn-ghost btn-sm"
					onclick={() => ($searchPattern = '')}
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
	<ExportButton
		exportedData={rows as any}
		downloadDescription={downloadDescription ?? 'delegator'}
	/>
</div>

<PrintHeader {title} searchPattern={$searchPattern ?? ''} />

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
