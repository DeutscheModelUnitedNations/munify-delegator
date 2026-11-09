<script lang="ts" generics="Row">
	import { cellText, type GridColumn } from '../gridColumn';
	import { cellStyle } from './stickyStyle';

	/** One cell: the column's component, or its text. Long text is cut, the whole of it on hover. */
	interface Props {
		column: GridColumn<Row>;
		row: Row;
		width: number;
		left?: number;
	}

	let { column, row, width, left }: Props = $props();

	const render = $derived(column.cell?.(row));
	const text = $derived(render ? '' : cellText({ column, row }));
</script>

<td
	class="truncate"
	class:pinned={left !== undefined}
	class:text-right={column.align === 'right'}
	class:text-center={column.align === 'center'}
	style={cellStyle({ width, left })}
	title={text || undefined}
>
	{#if render}
		<render.component {...render.props} />
	{:else}
		{text}
	{/if}
</td>
