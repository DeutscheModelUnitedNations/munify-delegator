<script lang="ts" generics="Row">
	import type { GroupProps } from './groupProps';
	import GridPagination from '../table/GridPagination.svelte';
	import PageRows from '../table/PageRows.svelte';
	import { pageRequest } from '../pageRequest';

	/**
	 * The rows of one innermost group, a page at a time with a pager of its own. Each group fetches
	 * only its own rows, when it is opened.
	 */
	let { grid, source, path, ...rows }: GroupProps<Row> = $props();

	let pageIndex = $state(0);
	const request = $derived(pageRequest({ grid, path, pageIndex }));
	const pageSize = $derived(request.pageSize);
	const read = $derived(await source.page(request));
	// read here, not in the fetch, so the rows follow the live queries behind them
	const page = $derived(read());
</script>

<PageRows {grid} rows={page.rows} {...rows} />
{#if page.total > pageSize}
	<tr>
		<td colspan={rows.colspan} class="p-0">
			<GridPagination
				compact
				{pageIndex}
				{pageSize}
				total={page.total}
				shown={page.rows.length}
				onpage={(index) => (pageIndex = index)}
			/>
		</td>
	</tr>
{/if}
