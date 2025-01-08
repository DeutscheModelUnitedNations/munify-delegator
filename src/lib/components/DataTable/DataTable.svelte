<script lang="ts" generics="RowData">
	import SvelteTable, { type TableColumns } from 'svelte-table';
	import { getTableSettings } from './dataTableSettings.svelte';
	import Fuse from 'fuse.js';
	import * as m from '$lib/paraglide/messages';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import DataTableSettingsButton from './DataTableSettingsButton.svelte';
	import PrintHeader from './DataTablePrintHeader.svelte';
	import ExportButton from './DataTableExportButton.svelte';

	interface Filter {
		label: string;
		matcher: (row: RowData) => boolean;
	}

	interface Props {
		columns: TableColumns<RowData>;
		rows: RowData[];
		enableSearch?: boolean;
		searchPattern?: string;
		queryParamKey?: string;
		title?: string;
		additionallyIndexedKeys?: string[];
		rowSelected?: (row: RowData) => void;
		filters?: Filter[];
	}

	let {
		columns,
		rows,
		enableSearch = true,
		searchPattern = $bindable(''),
		queryParamKey,
		additionallyIndexedKeys = [],
		title = $page.url.pathname.split('/').pop()!,
		filters,
		rowSelected
	}: Props = $props();
	const { getTableSize, getZebra } = getTableSettings();

	let showFilters = $state(filters !== undefined);
	let activeFilters = $state<Filter['label'][]>([]);

	if (queryParamKey && searchPattern.length === 0) {
		searchPattern = $page.url.searchParams.get(queryParamKey) || '';
	}

	$effect(() => {
		if (queryParamKey) {
			$page.url.searchParams.set(queryParamKey, searchPattern);

			if (searchPattern === '') {
				$page.url.searchParams.delete(queryParamKey);
			}
			goto(`?${$page.url.searchParams.toString()}`, { replaceState: true, keepFocus: true });
		}
	});

	let fuse = $derived(
		new Fuse(rows, {
			keys: [...columns.map((c) => c.key.toString()), 'id', ...additionallyIndexedKeys],
			shouldSort: true,
			threshold: 0.2,
			minMatchCharLength: 2
		})
	);
	let searchedAndFilteredColumns = $derived.by(() => {
		let filtered = rows;
		if (searchPattern !== '') {
			filtered = fuse.search(searchPattern).map((i) => i.item);
		}

		if (filters !== undefined) {
			for (const filter of filters) {
				if (activeFilters.includes(filter.label)) {
					filtered = filtered.filter(filter.matcher);
				}
			}
		}

		return filtered;
	});

	onMount(() => {
		if (
			searchedAndFilteredColumns.length === 1 &&
			queryParamKey &&
			$page.url.searchParams.get(queryParamKey) &&
			rowSelected
		) {
			// we assume that we hit a single result with a filter query key and therefore want
			// this entry to be selected automatically
			rowSelected(searchedAndFilteredColumns[0]);
		}
	});
</script>

<div class="w-full">
	<div class="mt-6 flex w-full items-center">
		{#if enableSearch}
			<label class="no-print input input-bordered mr-3 flex w-full items-center gap-2">
				<input type="text" class="grow" bind:value={searchPattern} placeholder={m.search()} />
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
		{#if filters !== undefined}
			<button
				onclick={() => (showFilters = !showFilters)}
				class="btn btn-square btn-ghost"
				aria-label="Show/Hide filters"
				title={m.showFilters()}
			>
				<i class="fa-duotone fa-filter text-xl"></i>
			</button>
		{/if}
		<DataTableSettingsButton />
		<ExportButton exportedData={rows as any} />
	</div>
	{#if showFilters && filters !== undefined}
		{#each filters as filter}
			<button
				onclick={() => {
					if (activeFilters.includes(filter.label)) {
						activeFilters = activeFilters.filter((f) => f !== filter.label);
					} else {
						activeFilters.push(filter.label);
					}
				}}
			>
				<div
					class="badge badge-primary mt-2 {activeFilters.includes(filter.label)
						? ''
						: 'badge-outline'}"
				>
					{filter.label}
				</div>
			</button>
		{/each}
	{/if}
	<PrintHeader {title} {searchPattern} />

	<div class="svelte-table-wrapper mt-4 w-full overflow-x-auto transition-all duration-300">
		<SvelteTable
			{columns}
			rows={searchedAndFilteredColumns}
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
