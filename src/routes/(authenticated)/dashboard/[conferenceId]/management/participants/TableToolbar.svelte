<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import type { Table, ColumnFiltersState } from '$lib/components/tanStackTable';
	import type { ParticipantTableFeatures } from './tableFeatures';
	import type { ParticipantRow } from './types';

	interface Props {
		table: Table<ParticipantTableFeatures, ParticipantRow>;
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

	const issueFilterActive = $derived(
		columnFilters.some((f) => f.id === 'hasOpenIssue' && f.value === true)
	);

	/** Shows accepted participants with an open issue; clicking again drops both filters. */
	function toggleIssueFilter() {
		if (issueFilterActive) {
			table.getColumn('hasOpenIssue')?.setFilterValue(undefined);
			return;
		}
		table.getColumn('accepted')?.setFilterValue(true);
		table.getColumn('hasOpenIssue')?.setFilterValue(true);
	}

	function clearAllFilters() {
		table.resetColumnFilters();
	}

	const activeFilterCount = $derived(columnFilters.length);
	const filteredCount = $derived(table.getFilteredRowModel().rows.length);
	const totalCount = $derived(table.getCoreRowModel().rows.length);
</script>

<div class="flex flex-col gap-2 px-1 py-2">
	<div class="flex items-center gap-2">
		<label class="input input-md flex w-full max-w-sm items-center gap-2">
			<i class="fa-duotone fa-magnifying-glass text-base-content/50"></i>
			<input
				type="text"
				class="grow"
				placeholder={m.search()}
				value={globalFilter}
				oninput={(e) => onGlobalFilterChange(e.currentTarget.value)}
			/>
			{#if globalFilter}
				<button
					class="btn btn-ghost btn-xs btn-circle"
					aria-label={m.reset()}
					onclick={() => onGlobalFilterChange('')}
				>
					<i class="fa-duotone fa-xmark"></i>
				</button>
			{/if}
		</label>

		<div class="grow"></div>

		<button
			class="btn btn-sm {issueFilterActive ? 'btn-warning' : 'btn-ghost'}"
			aria-pressed={issueFilterActive}
			title={m.openIssuesDescription()}
			onclick={toggleIssueFilter}
		>
			<i class="fa-duotone fa-triangle-exclamation"></i>
			{m.openIssues()}
		</button>

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

	<div class="flex flex-wrap items-center gap-1.5">
		{#each columnFilters as filter (filter.id)}
			<button
				class="btn btn-sm btn-soft btn-primary rounded-full text-sm font-normal"
				aria-label="{m.reset()}: {table.getColumn(filter.id)?.columnDef.header ?? filter.id}"
				onclick={() => table.getColumn(filter.id)?.setFilterValue(undefined)}
			>
				{table.getColumn(filter.id)?.columnDef.header ?? filter.id}
				<i class="fa-duotone fa-xmark"></i>
			</button>
		{/each}
		{#if activeFilterCount > 0}
			<button
				class="btn btn-ghost btn-sm rounded-full text-sm font-normal"
				onclick={clearAllFilters}
			>
				<i class="fa-duotone fa-filter-circle-xmark"></i>
				{m.clearAllFilters()}
			</button>
		{/if}
		<span class="ml-auto text-sm whitespace-nowrap text-base-content/60">
			{filteredCount} / {totalCount}
		</span>
	</div>
</div>
