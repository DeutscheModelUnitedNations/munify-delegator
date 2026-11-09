<script lang="ts" generics="Row">
	import type { GridState } from '../gridState.svelte';
	import type { RowProps } from '../rowProps';
	import GridRow from './GridRow.svelte';

	/** The rows of a page, keyed by their id. */
	interface Props extends RowProps<Row> {
		grid: GridState<Row>;
		rows: readonly Row[];
	}

	let { grid, rows, ...props }: Props = $props();
</script>

{#each rows as row (grid.rowKey(row))}
	<GridRow
		{row}
		{grid}
		layout={props.layout}
		selectable={props.selectable}
		onRowClick={props.onRowClick}
		highlighted={props.isRowHighlighted?.(row)}
		actions={props.actions}
		actionsWidth={props.actionsWidth}
	/>
{/each}
