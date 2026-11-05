<script lang="ts" generics="Row">
	import { m } from '#lib/paraglide/messages';
	import { isFilterable, isSortable } from '#lib/dataGrid/columnTypes';
	import type { GridColumn } from '../gridColumn';
	import type { GridState } from '../gridState.svelte';
	import ResizeHandle from './ResizeHandle.svelte';
	import { cellStyle } from './stickyStyle';

	/**
	 * A column's header: its label sorts (shift adds it to the sorting), the funnel adds a filter
	 * condition on it, the right edge resizes it.
	 */
	interface Props {
		column: GridColumn<Row>;
		grid: GridState<Row>;
		width: number;
		left?: number;
		/** Opens the filter panel, after a condition on the column was added */
		onfilter: () => void;
	}

	let { column, grid, width, left, onfilter }: Props = $props();

	const sortIndex = $derived(grid.state.sorting.findIndex((entry) => entry.id === column.id));
	const sorted = $derived(sortIndex === -1 ? undefined : grid.state.sorting[sortIndex]);
	const sortable = $derived(isSortable(column));
	const ariaSort = $derived(
		sorted ? (sorted.desc ? 'descending' : 'ascending') : sortable ? 'none' : undefined
	);
</script>

<th
	class="bg-base-200 relative"
	style={cellStyle({ width, left })}
	style:z-index={left !== undefined ? 3 : 2}
	aria-sort={ariaSort}
	title={column.description}
>
	<div class="flex items-center gap-1 pr-2">
		{#if sortable}
			<button
				class="flex min-w-0 grow items-center gap-1 text-left"
				onclick={(event) => grid.toggleSort({ id: column.id, multi: event.shiftKey })}
				title={m.dataGridSortHint()}
			>
				<span class="truncate">{column.label}</span>
				{#if sorted}
					<i
						class="fa-sharp-duotone fa-solid {sorted.desc
							? 'fa-arrow-down-wide-short'
							: 'fa-arrow-up-short-wide'} text-primary text-xs"
					></i>
					{#if grid.state.sorting.length > 1}
						<span class="text-primary text-[0.6rem]">{sortIndex + 1}</span>
					{/if}
				{:else}
					<i
						class="fa-sharp-duotone fa-solid fa-arrows-up-down text-xs opacity-0 group-hover/head:opacity-30"
					></i>
				{/if}
			</button>
		{:else}
			<span class="grow truncate">{column.label}</span>
		{/if}
		{#if isFilterable(column)}
			<button
				class="btn btn-ghost btn-xs btn-square no-print opacity-40 hover:opacity-100"
				aria-label={m.dataGridFilterBy({ column: column.label })}
				onclick={() => {
					grid.filterBy(column);
					onfilter();
				}}
			>
				<i class="fa-sharp-duotone fa-solid fa-filter text-xs"></i>
			</button>
		{/if}
	</div>
	<ResizeHandle
		{width}
		onresize={(next) => grid.resize({ id: column.id, width: next })}
		onreset={() => grid.resize({ id: column.id, width: column.size ?? 160 })}
	/>
</th>
