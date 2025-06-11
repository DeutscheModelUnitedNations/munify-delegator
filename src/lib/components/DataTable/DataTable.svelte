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
	import { goto } from '$app/navigation';

	interface Props {
		columns: TableColumns<RowData>;
		rows: RowData[];
		enableSearch?: boolean;
		searchPattern?: string;
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
		searchPattern = $bindable(''),
		queryParamKey,
		additionallyIndexedKeys = [],
		title = page.url.pathname.split('/').pop()!,
		tableClass,
		rowSelected
	}: Props = $props();
	const { getTableSize, getZebra } = getTableSettings();

	if (queryParamKey && searchPattern.length === 0) {
		searchPattern = page.url.searchParams.get(queryParamKey) || '';
	}

	function onSearchPatternInput(e: Event) {
		if (queryParamKey) {
			if (searchPattern === '') {
				page.url.searchParams.delete(queryParamKey);
			} else {
				page.url.searchParams.set(queryParamKey, searchPattern);
			}

			goto(new URL(page.url), {
				replaceState: true,
				keepFocus: true,
				noScroll: true,
				invalidateAll: false
			});
		}
	}

	let fuse = $derived(
		new Fuse(rows, {
			keys: [...columns.map((c) => c.key.toString()), 'id', ...additionallyIndexedKeys],
			shouldSort: true,
			threshold: 0.2,
			minMatchCharLength: 2
		})
	);
	let searchedColumns = $derived(
		searchPattern !== '' ? fuse.search(searchPattern).map((i) => i.item) : rows
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
</script>

<div class="w-full">
	<div class="mt-6 flex w-full items-center">
		{#if enableSearch}
			<label class="no-print input input-bordered mr-3 flex w-full items-center gap-2">
				<input
					type="text"
					class="grow"
					bind:value={searchPattern}
					oninput={onSearchPatternInput}
					placeholder={m.search()}
				/>
				{#if searchPattern !== ''}
					<button
						class="btn btn-square btn-ghost btn-sm"
						onclick={() => (searchPattern = '')}
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

	<PrintHeader {title} {searchPattern} />

	<div
		class="svelte-table-wrapper mt-4 w-full overflow-x-auto transition-all duration-300 {tableClass}"
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
</div>

<style>
	.svelte-table-wrapper :global(> table > tbody > tr) {
		@apply transition-all duration-300;
	}
</style>
