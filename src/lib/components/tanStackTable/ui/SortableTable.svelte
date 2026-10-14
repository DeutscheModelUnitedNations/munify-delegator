<script lang="ts" generics="TFeatures extends TableFeatures, TData extends RowData">
	import {
		column_getCanSort,
		column_getIsSorted,
		column_toggleSorting,
		row_getVisibleCells,
		table_getVisibleLeafColumns
	} from '@tanstack/svelte-table/static-functions';
	import {
		FlexRender,
		type RowData,
		type Table,
		type TableFeatures
	} from '$lib/components/tanStackTable';
	import { m } from '$lib/paraglide/messages';
	import TableRoot from './Table.svelte';
	import SortButton from './SortButton.svelte';
	import TableHeader from './TableHeader.svelte';
	import TableBody from './TableBody.svelte';
	import TableRow from './TableRow.svelte';
	import TableHead from './TableHead.svelte';
	import TableCell from './TableCell.svelte';

	/**
	 * A table with click-to-sort column headers and clickable rows, rendering whatever the
	 * column definitions render. The sorting and visibility calls go through the static functions:
	 * a table generic over its features has no feature methods in its type, though any table
	 * registering `rowSortingFeature` and `columnVisibilityFeature` has them at runtime.
	 */
	interface Props {
		table: Table<TFeatures, TData>;
		onRowClick?: (row: TData) => void;
		/** Highlights the rows it returns true for. */
		isRowSelected?: (row: TData) => boolean;
		/** Extra classes for a column's header and cells, by column id. */
		columnClasses?: Record<string, string>;
		class?: string;
	}

	let {
		table,
		onRowClick,
		isRowSelected,
		columnClasses = {},
		class: className = ''
	}: Props = $props();
</script>

<TableRoot class={className}>
	<TableHeader>
		{#each table.getHeaderGroups() as headerGroup (headerGroup.id)}
			<tr>
				{#each headerGroup.headers as header (header.id)}
					{@const canSort = column_getCanSort(header.column)}
					{@const sorted = column_getIsSorted(header.column)}
					<TableHead class={columnClasses[header.column.id]}>
						{#if !header.isPlaceholder}
							<SortButton {sorted} {canSort} onclick={() => column_toggleSorting(header.column)}>
								<FlexRender {header} />
							</SortButton>
						{/if}
					</TableHead>
				{/each}
			</tr>
		{/each}
	</TableHeader>
	<TableBody>
		{#each table.getRowModel().rows as row (row.id)}
			<TableRow selected={isRowSelected?.(row.original)} onclick={() => onRowClick?.(row.original)}>
				{#each row_getVisibleCells(row) as cell (cell.id)}
					<TableCell class={columnClasses[cell.column.id]}>
						<FlexRender {cell} />
					</TableCell>
				{/each}
			</TableRow>
		{:else}
			<tr>
				<td
					colspan={table_getVisibleLeafColumns(table).length}
					class="text-base-content/50 py-8 text-center"
				>
					{m.noResults()}
				</td>
			</tr>
		{/each}
	</TableBody>
</TableRoot>
