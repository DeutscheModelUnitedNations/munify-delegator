<script lang="ts" generics="Row">
	import { browser } from '$app/env';
	import { m } from '#lib/paraglide/messages';
	import type { GridSource } from './dataSource';
	import type { GridState } from './gridState.svelte';
	import GroupLevel from './grouping/GroupLevel.svelte';
	import LoadingRow from './grouping/LoadingRow.svelte';
	import type { RowProps } from './rowProps';
	import GridTable from './table/GridTable.svelte';
	import PageSizeSelect from './table/PageSizeSelect.svelte';

	/**
	 * The table grouped: the groups of the outermost level, each opening into the next level or its
	 * rows. The page size applies within each innermost group.
	 */
	interface Props extends RowProps<Row> {
		grid: GridState<Row>;
		source: GridSource<Row>;
		label: string;
		onfilter: () => void;
	}

	let { grid, source, label, onfilter, ...rows }: Props = $props();
</script>

{#snippet loading()}
	<LoadingRow colspan={rows.colspan} level={0} />
{/snippet}

<GridTable
	{grid}
	layout={rows.layout}
	{label}
	selectable={rows.selectable}
	actionsWidth={rows.actionsWidth}
	{onfilter}
>
	<tbody>
		<svelte:boundary pending={browser ? loading : undefined}>
			<GroupLevel {grid} {source} path={[]} {...rows} />
		</svelte:boundary>
	</tbody>
</GridTable>
<div class="no-print flex justify-end px-2 py-3">
	<PageSizeSelect
		pageSize={grid.state.pageSize}
		label={m.dataGridRowsPerGroup()}
		onpagesize={(size) => grid.setPageSize(size)}
	/>
</div>
