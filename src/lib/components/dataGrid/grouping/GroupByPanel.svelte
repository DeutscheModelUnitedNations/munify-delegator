<script lang="ts" generics="Row">
	import { m } from '#lib/paraglide/messages';
	import { isGroupable } from '#lib/dataGrid/columnTypes';
	import { MAX_GROUP_LEVELS, type GroupBy } from '#lib/dataGrid/stateSchema';
	import type { GridState } from '../gridState.svelte';
	import SideDrawer from '../panels/SideDrawer.svelte';
	import GroupByLevel from './GroupByLevel.svelte';

	/**
	 * Grouping: up to three columns, outermost first. The groups show collapsible, each with how many
	 * rows it holds; "expand all" and "collapse all" set them all at once.
	 */
	interface Props {
		open: boolean;
		grid: GridState<Row>;
	}

	let { open = $bindable(), grid }: Props = $props();

	const groupable = $derived(grid.columns.filter(isGroupable));
	const grouping = $derived(grid.state.grouping);
	const unused = $derived(
		groupable.filter((column) => !grouping.some((entry) => entry.column === column.id))
	);

	const replaceAt = (index: number, groupBy: GroupBy) =>
		grouping.map((entry, i) => (i === index ? groupBy : entry));
</script>

<SideDrawer bind:open title={m.dataGridGroupBy()} icon="fa-layer-group">
	{#if grouping.length === 0}
		<p class="text-base-content/60 py-4 text-center text-sm">{m.dataGridNoGrouping()}</p>
	{/if}
	{#each grouping as groupBy, index (index)}
		<GroupByLevel
			level={index}
			{groupBy}
			columns={groupable.filter(
				(column) =>
					column.id === groupBy.column || !grouping.some((entry) => entry.column === column.id)
			)}
			onchange={(next) => grid.setGrouping(replaceAt(index, next))}
			onremove={() => grid.setGrouping(grouping.filter((_, i) => i !== index))}
		/>
	{/each}
	<button
		class="btn btn-sm btn-outline self-start"
		disabled={grouping.length >= MAX_GROUP_LEVELS || unused.length === 0}
		onclick={() => grid.setGrouping([...grouping, { column: unused[0].id }])}
	>
		<i class="fa-sharp-duotone fa-solid fa-plus"></i>
		{grouping.length === 0 ? m.dataGridAddGrouping() : m.dataGridAddSubgrouping()}
	</button>
	{#if grouping.length > 0}
		<div class="flex flex-wrap gap-2">
			<button class="btn btn-ghost btn-sm" onclick={() => grid.expandAll()}>
				<i class="fa-sharp-duotone fa-solid fa-chevrons-down"></i>
				{m.dataGridExpandAll()}
			</button>
			<button class="btn btn-ghost btn-sm" onclick={() => grid.collapseAll()}>
				<i class="fa-sharp-duotone fa-solid fa-chevrons-up"></i>
				{m.dataGridCollapseAll()}
			</button>
		</div>
	{/if}
	{#snippet footer()}
		<button
			class="btn btn-ghost btn-sm"
			disabled={grouping.length === 0}
			onclick={() => grid.setGrouping([])}
		>
			{m.dataGridClearGrouping()}
		</button>
		<button class="btn btn-primary btn-sm ml-auto" onclick={() => (open = false)}>{m.done()}</button
		>
	{/snippet}
</SideDrawer>
