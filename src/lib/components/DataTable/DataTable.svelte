<script lang="ts" generics="RowData">
	import SvelteTable, { type TableColumns } from 'svelte-table';
	import { getTableSettings } from './dataTableSettings.svelte';
	import Fuse from 'fuse.js';
	import { m } from '$lib/paraglide/messages';
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import DataTableSettingsButton from './DataTableSettingsButton.svelte';
	import PrintHeader from './DataTablePrintHeader.svelte';
	import ExportButton from './DataTableExportButton.svelte';
	import { queryParam } from 'sveltekit-search-params';

	interface Props {
		columns: TableColumns<RowData>;
		rows: RowData[];
		enableSearch?: boolean;
		queryParamKey?: string;
		title?: string;
		additionallyIndexedKeys?: string[];
		rowSelected?: (row: RowData) => void;
		tableClass?: string;
	}

	let {
		columns,
		rows,
		enableSearch = true,
		queryParamKey,
		additionallyIndexedKeys = [],
		title = page.url.pathname.split('/').pop()!,
		tableClass,
		rowSelected
	}: Props = $props();
	const { getTableSize, getZebra } = getTableSettings();

	let searchPattern = queryParam(queryParamKey ?? 'filter');

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

<div class="flex min-w-0 items-center overflow-x-auto">
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
	<ExportButton exportedData={rows as any} />
</div>

<PrintHeader {title} searchPattern={$searchPattern ?? ''} />

<div
	class="svelte-table-wrapper mt-4 max-h-[80vh] min-w-0 overflow-x-auto transition-all duration-300 {tableClass}"
>
	<SvelteTable
		{columns}
		rows={searchedColumns}
		on:clickRow={(e) => (rowSelected ? rowSelected(e.detail.row) : null)}
		rowKey="id"
		classNameTable="table {getZebra() && 'table-zebra'} table-{getTableSize()} table-pin-rows"
		classNameRow="hover:!bg-base-300 cursor-pointer"
		iconAsc="<i class='fa-duotone fa-arrow-down-a-z'></i>"
		iconDesc="<i class='fa-duotone fa-arrow-down-z-a'></i>"
		iconSortable="<i class='fa-solid fa-sort'></i>"
		sortBy="family_name"
	/>
</div>

<style lang="postcss">
	.svelte-table-wrapper :global(> table > tbody > tr) {
		transition-property: all;
		transition-timing-function: var(--tw-ease, var(--default-transition-timing-function));
		--tw-duration: 300ms;
		transition-duration: 300ms;
	}
</style>
