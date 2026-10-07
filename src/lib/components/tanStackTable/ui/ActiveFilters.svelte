<script lang="ts" generics="TData extends object">
	import { m } from '$lib/paraglide/messages';
	import type { ColumnFiltersState, Table } from '$lib/components/tanStackTable';
	import {
		columnHeaderOf,
		columnIdOf,
		type ManagedColumn,
		type ManagedTableFeatures
	} from '$lib/components/tanStackTable/managedTable';

	/** One chip per active column filter, each removing its filter, and a button to drop them all. */
	interface Props {
		table: Table<ManagedTableFeatures, TData>;
		columns: ManagedColumn<TData>[];
		columnFilters: ColumnFiltersState;
	}

	let { table, columns, columnFilters }: Props = $props();

	function headerOf(id: string): string {
		const def = columns.find((column) => columnIdOf(column) === id);
		return (def && columnHeaderOf(def)) || id;
	}
</script>

{#if columnFilters.length > 0}
	<div class="no-print mt-2 flex flex-wrap items-center gap-1.5">
		{#each columnFilters as filter (filter.id)}
			<button
				class="btn btn-sm btn-soft btn-primary rounded-full text-sm font-normal"
				aria-label="{m.reset()}: {headerOf(filter.id)}"
				onclick={() => table.getColumn(filter.id)?.setFilterValue(undefined)}
			>
				{headerOf(filter.id)}
				<i class="fa-duotone fa-xmark"></i>
			</button>
		{/each}
		<button
			class="btn btn-ghost btn-sm rounded-full text-sm font-normal"
			onclick={() => table.resetColumnFilters()}
		>
			<i class="fa-duotone fa-filter-circle-xmark"></i>
			{m.clearAllFilters()}
		</button>
	</div>
{/if}
