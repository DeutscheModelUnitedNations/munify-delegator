<script lang="ts" generics="Row">
	import { m } from '#lib/paraglide/messages';
	import { columnGroups } from '../gridColumn';
	import type { GridState } from '../gridState.svelte';
	import SideDrawer from '../panels/SideDrawer.svelte';
	import ColumnPanelItem from './ColumnPanelItem.svelte';

	/**
	 * Which columns show and in which order: the shown ones first, in their order, to move up and
	 * down; then every other column by its heading, to switch on.
	 */
	interface Props {
		open: boolean;
		grid: GridState<Row>;
	}

	let { open = $bindable(), grid }: Props = $props();

	const shown = $derived(grid.visibleColumns);
	const shownIds = $derived(new Set(shown.map((column) => column.id)));
	const hidden = $derived(
		columnGroups({
			columns: grid.columns.filter((column) => !shownIds.has(column.id)),
			fallback: m.dataGridOtherColumns()
		})
	);
	const firstMovable = $derived(grid.pinned.length);
</script>

<SideDrawer bind:open title={m.columns()} icon="fa-columns">
	<section>
		<h3 class="text-base-content/70 mb-1 text-sm font-semibold">{m.dataGridShownColumns()}</h3>
		<ul class="divide-base-300 divide-y">
			{#each shown as column, index (column.id)}
				<ColumnPanelItem
					{column}
					visible
					canMoveUp={index > firstMovable}
					canMoveDown={index < shown.length - 1}
					ontoggle={(visible) => grid.setVisible({ id: column.id, visible })}
					onmove={(delta) => grid.moveColumn({ id: column.id, delta })}
				/>
			{/each}
		</ul>
	</section>
	{#each hidden as group (group.title)}
		<section>
			<h3 class="text-base-content/70 mb-1 text-sm font-semibold">{group.title}</h3>
			<ul class="divide-base-300 divide-y">
				{#each group.columns as column (column.id)}
					<ColumnPanelItem
						{column}
						visible={false}
						canMoveUp={false}
						canMoveDown={false}
						ontoggle={(visible) => grid.setVisible({ id: column.id, visible })}
						onmove={() => {}}
					/>
				{/each}
			</ul>
		</section>
	{/each}
	{#snippet footer()}
		<button class="btn btn-ghost btn-sm" onclick={() => grid.resetSizes()}>
			<i class="fa-sharp-duotone fa-solid fa-arrows-left-right"></i>
			{m.dataGridResetWidths()}
		</button>
		<button class="btn btn-primary btn-sm ml-auto" onclick={() => (open = false)}>{m.done()}</button
		>
	{/snippet}
</SideDrawer>
