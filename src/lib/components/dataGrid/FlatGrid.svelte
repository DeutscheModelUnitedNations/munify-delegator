<script lang="ts" generics="Row">
	import { untrack } from 'svelte';
	import { soleRow } from './soleRow';
	import type { GridSource } from './dataSource';
	import type { GridState } from './gridState.svelte';
	import type { RowProps } from './rowProps';
	import EmptyRows from './table/EmptyRows.svelte';
	import GridPagination from './table/GridPagination.svelte';
	import PageRows from './table/PageRows.svelte';
	import { pageRequest } from './pageRequest';
	import GridTable from './table/GridTable.svelte';

	/** The table without grouping: one page of rows and the pager. */
	interface Props extends RowProps<Row> {
		grid: GridState<Row>;
		source: GridSource<Row>;
		label: string;
		emptyText?: string;
		onfilter: () => void;
		/** Called once, when the first page shows exactly one row (see `openSoleMatch` of `DataGrid`) */
		onSoleMatch?: (row: Row) => void;
	}

	let { grid, source, label, emptyText, onfilter, onSoleMatch, ...rows }: Props = $props();

	const pageIndex = $derived(grid.pageIndex);
	const pageSize = $derived(grid.state.pageSize);
	// not grouped: the grouping is no part of what this asks
	const request = $derived(pageRequest({ grid, pageIndex, flat: true }));
	const read = $derived(await source.page(request));
	// read here, not in the fetch, so the rows follow the live queries behind them
	const page = $derived(read());

	// the rows are plain copies here, so an effect may read them
	let soleMatchDone = false;
	$effect(() => {
		if (soleMatchDone || !onSoleMatch) return;
		soleMatchDone = true;
		const only = soleRow(page.rows);
		if (only) untrack(() => onSoleMatch(only));
	});
</script>

<GridTable
	{grid}
	layout={rows.layout}
	{label}
	selectable={rows.selectable}
	actionsWidth={rows.actionsWidth}
	pageRows={page.rows}
	{onfilter}
>
	{#if page.rows.length > 0}
		<tbody>
			<PageRows {grid} rows={page.rows} {...rows} />
		</tbody>
	{:else}
		<EmptyRows colspan={rows.colspan} text={emptyText} />
	{/if}
</GridTable>
<GridPagination
	{pageIndex}
	{pageSize}
	total={page.total}
	shown={page.rows.length}
	onpage={(index) => grid.setPage(index)}
	onpagesize={(size) => grid.setPageSize(size)}
/>
