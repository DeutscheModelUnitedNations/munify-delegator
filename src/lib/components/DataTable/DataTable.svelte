<script lang="ts" generics="RowData">
	import SvelteTable, { type TableColumns } from 'svelte-table';
	import { getTableSettings } from './dataTableSettings.svelte';
	import Fuse from 'fuse.js';
	import * as m from '$lib/paraglide/messages';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';

	interface Props {
		columns: TableColumns<RowData>;
		rows: RowData[];
		enableSearch?: boolean;
		searchPattern?: string;
		queryParamKey?: string;
		rowSelected?: (row: RowData) => void;
	}

	let {
		columns,
		rows,
		enableSearch = true,
		searchPattern = $bindable(''),
		queryParamKey,
		rowSelected
	}: Props = $props();
	const { getTableSize, getZebra } = getTableSettings();

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
			keys: [...columns.map((c) => c.key.toString()), 'id']
		})
	);
	let searchedColumns = $derived(
		searchPattern !== '' ? fuse.search(searchPattern).map((i) => i.item) : rows
	);

	onMount(() => {
		// svelte-ignore state_referenced_locally
		if (
			searchedColumns.length === 1 &&
			queryParamKey &&
			$page.url.searchParams.get(queryParamKey) &&
			rowSelected
		) {
			// we assume that we hit a single result with a filter query key and therefore want
			// this entry to be selected automatically
			rowSelected(searchedColumns[0]);
		}
	});
</script>

<div class="w-full">
	{#if enableSearch}
		<label class="no-print input input-bordered mt-6 flex items-center gap-2">
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

	<div class="svelte-table-wrapper mt-4 w-full overflow-x-auto transition-all duration-300">
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
