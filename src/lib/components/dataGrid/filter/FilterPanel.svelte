<script lang="ts" generics="Row">
	import { m } from '#lib/paraglide/messages';
	import { emptyFilter } from '#lib/dataGrid/stateSchema';
	import type { GridState } from '../gridState.svelte';
	import SideDrawer from '../panels/SideDrawer.svelte';
	import FilterBuilder from './FilterBuilder.svelte';

	/** The filter builder in a drawer at the side. */
	interface Props {
		open: boolean;
		grid: GridState<Row>;
	}

	let { open = $bindable(), grid }: Props = $props();
</script>

<SideDrawer bind:open title={m.filters()} icon="ph-funnel">
	<FilterBuilder
		filter={grid.state.filter}
		columns={grid.columns}
		onchange={(filter) => grid.setFilter(filter)}
	/>
	{#snippet footer()}
		<button
			class="btn btn-ghost btn-sm"
			disabled={grid.state.filter.items.length === 0}
			onclick={() => grid.setFilter(emptyFilter())}
		>
			<i class="ph-duotone ph-funnel-x"></i>
			{m.dataGridClearFilter()}
		</button>
		<button class="btn btn-primary btn-sm ml-auto" onclick={() => (open = false)}>
			{m.done()}
		</button>
	{/snippet}
</SideDrawer>
