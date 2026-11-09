<script lang="ts" generics="Row">
	import type { Snippet } from 'svelte';
	import { m } from '#lib/paraglide/messages';
	import { getTableSettings } from '../toolbar/tableSettings.svelte';
	import type { GridState } from '../gridState.svelte';
	import GridHeaderCell from './GridHeaderCell.svelte';
	import type { GridLayout } from './layout';
	import { SELECT_WIDTH } from './layout';
	import { cellStyle } from './stickyStyle';

	/**
	 * The table around the rows: the header with sorting, filtering and resizing, the pinned columns,
	 * and a scroll box of its own so the header and the pinned columns have something to stick to.
	 * The rows are the caller's (`children`): one page, or the groups.
	 */
	interface Props {
		grid: GridState<Row>;
		layout: GridLayout<Row>;
		label: string;
		selectable: boolean;
		actionsWidth: number;
		/** The rows a header checkbox selects; none in a grouped table */
		pageRows?: readonly Row[];
		onfilter: () => void;
		children: Snippet;
	}

	let { grid, layout, label, selectable, actionsWidth, pageRows, onfilter, children }: Props =
		$props();

	const { getTableSize, getZebra } = getTableSettings();

	const allSelected = $derived(
		!!pageRows && pageRows.length > 0 && pageRows.every((row) => grid.isSelected(row))
	);
	const someSelected = $derived(!!pageRows && pageRows.some((row) => grid.isSelected(row)));
</script>

<div
	class="border-base-300 rounded-box max-h-[75dvh] min-h-40 overflow-auto border max-sm:max-h-none"
>
	<table
		class="data-grid table table-fixed border-separate border-spacing-0 table-{getTableSize()}"
		class:table-zebra={getZebra()}
		style="width:{layout.total}px;min-width:100%"
		aria-label={label}
	>
		<thead class="group/head sticky top-0 z-[2]">
			<tr>
				{#if selectable}
					<th
						class="bg-base-200"
						style={cellStyle({ width: SELECT_WIDTH, left: 0 })}
						style:z-index="3"
					>
						{#if pageRows}
							<input
								type="checkbox"
								class="checkbox checkbox-sm"
								checked={allSelected}
								indeterminate={someSelected && !allSelected}
								aria-label={m.dataGridSelectPage()}
								onchange={(event) =>
									grid.setSelected({ rows: pageRows, selected: event.currentTarget.checked })}
							/>
						{/if}
					</th>
				{/if}
				{#each layout.cells as cell (cell.column.id)}
					<GridHeaderCell
						column={cell.column}
						{grid}
						width={cell.width}
						left={cell.left}
						{onfilter}
					/>
				{/each}
				{#if actionsWidth > 0}
					<th
						class="bg-base-200"
						style={cellStyle({ width: actionsWidth, right: true })}
						style:z-index="3"
					>
						<span class="sr-only">{m.actions()}</span>
					</th>
				{/if}
			</tr>
		</thead>
		{@render children()}
	</table>
</div>

<style>
	/*
	 * Pinned cells stick over the others while the table scrolls sideways, so they need a background
	 * of their own: the row's, zebra stripe and hover included.
	 */
	.data-grid :global(td.pinned) {
		background-color: var(--color-base-100);
	}
	.data-grid:global(.table-zebra) :global(tbody tr:nth-child(even) td.pinned),
	.data-grid :global(tbody tr:hover td.pinned) {
		background-color: var(--color-base-200);
	}
</style>
