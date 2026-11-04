<script lang="ts" generics="Row">
	import type { Snippet } from 'svelte';
	import { m } from '#lib/paraglide/messages';
	import type { GridState } from '../gridState.svelte';
	import GridCell from './GridCell.svelte';
	import type { GridLayout } from './layout';
	import { SELECT_WIDTH } from './layout';
	import { cellStyle } from './stickyStyle';

	/**
	 * One row: its selection box, its cells, its actions. A click anywhere but on a control opens
	 * the row (`onRowClick`); the keyboard reaches it through the row's first cell.
	 */
	interface Props {
		row: Row;
		grid: GridState<Row>;
		layout: GridLayout<Row>;
		selectable: boolean;
		onRowClick?: (row: Row) => void;
		highlighted?: boolean;
		actions?: Snippet<[Row]>;
		actionsWidth: number;
	}

	let { row, grid, layout, selectable, onRowClick, highlighted, actions, actionsWidth }: Props =
		$props();

	const selected = $derived(grid.isSelected(row));

	function open(event: MouseEvent) {
		// controls inside the row (buttons, links, the selection box) do their own thing
		if (event.target instanceof Element && event.target.closest('a, button, input, select, label'))
			return;
		onRowClick?.(row);
	}

	function openByKey(event: KeyboardEvent) {
		if (event.key === 'Enter' && event.target === event.currentTarget) onRowClick?.(row);
	}
</script>

<tr
	class="group/row hover:bg-base-200 {highlighted ? 'bg-accent/30' : ''} {selected
		? 'bg-primary/10'
		: ''}"
	class:cursor-pointer={!!onRowClick}
	onclick={open}
	onkeydown={openByKey}
	tabindex={onRowClick ? 0 : undefined}
>
	{#if selectable}
		<td class="pinned" style={cellStyle({ width: SELECT_WIDTH, left: 0 })}>
			<input
				type="checkbox"
				class="checkbox checkbox-sm"
				checked={selected}
				aria-label={m.dataGridSelectRow()}
				onchange={(event) =>
					grid.setSelected({ rows: [row], selected: event.currentTarget.checked })}
			/>
		</td>
	{/if}
	{#each layout.cells as cell (cell.column.id)}
		<GridCell column={cell.column} {row} width={cell.width} left={cell.left} />
	{/each}
	{#if actions}
		<td class="pinned" style={cellStyle({ width: actionsWidth, right: true })}>
			{@render actions(row)}
		</td>
	{/if}
</tr>
