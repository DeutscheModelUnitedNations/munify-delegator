<script lang="ts" generics="TData">
	import { m } from '$lib/paraglide/messages';
	import type { Table, ColumnFiltersState } from '$lib/components/TanStackTable';

	interface Props {
		table: Table<TData>;
		globalFilter: string;
		onGlobalFilterChange: (value: string) => void;
		columnFilters: ColumnFiltersState;
		onOpenFilterDrawer: () => void;
		onOpenColumnConfig: () => void;
		onExport: () => void;
	}

	let {
		table,
		globalFilter,
		onGlobalFilterChange,
		columnFilters,
		onOpenFilterDrawer,
		onOpenColumnConfig,
		onExport
	}: Props = $props();

	const activeFilterCount = $derived(columnFilters.length);
	const filteredCount = $derived(table.getFilteredRowModel().rows.length);
	const totalCount = $derived(table.getCoreRowModel().rows.length);
</script>

<div class="flex items-center gap-2 px-1 py-2">
	<label class="input input-sm input-bordered flex items-center gap-2">
		<i class="fa-duotone fa-magnifying-glass text-base-content/50"></i>
		<input
			type="text"
			class="grow"
			placeholder={m.search()}
			value={globalFilter}
			oninput={(e) => onGlobalFilterChange(e.currentTarget.value)}
		/>
		{#if globalFilter}
			<button class="btn btn-ghost btn-xs btn-circle" onclick={() => onGlobalFilterChange('')}>
				<i class="fa-duotone fa-xmark"></i>
			</button>
		{/if}
	</label>

	{#if activeFilterCount > 0}
		<div class="flex flex-wrap items-center gap-1">
			{#each columnFilters as filter (filter.id)}
				<span class="badge gap-1">
					{table.getColumn(filter.id)?.columnDef.header ?? filter.id}
					<button
						class="btn btn-xs btn-ghost"
						onclick={() => table.getColumn(filter.id)?.setFilterValue(undefined)}
					>
						<i class="fa-duotone fa-xmark text-xs"></i>
					</button>
				</span>
			{/each}
		</div>
	{/if}

	<div class="grow"></div>

	<span class="text-sm text-base-content/60 whitespace-nowrap">
		{filteredCount} / {totalCount}
	</span>

	<button class="btn btn-ghost btn-sm" onclick={onOpenFilterDrawer}>
		<i class="fa-duotone fa-filter"></i>
		{m.filters()}
		{#if activeFilterCount > 0}
			<span class="badge badge-primary badge-xs">{activeFilterCount}</span>
		{/if}
	</button>

	<button class="btn btn-ghost btn-sm" onclick={onOpenColumnConfig}>
		<i class="fa-duotone fa-columns"></i>
		{m.columns()}
	</button>

	<button class="btn btn-ghost btn-sm" onclick={onExport}>
		<i class="fa-duotone fa-file-export"></i>
		{m.exportCsv()}
	</button>
</div>
