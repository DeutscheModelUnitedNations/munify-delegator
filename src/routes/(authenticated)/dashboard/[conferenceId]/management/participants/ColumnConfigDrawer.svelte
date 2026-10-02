<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import type { Table, ColumnVisibilityState } from '$lib/components/tanStackTable';
	import type { ParticipantRow } from './types';
	import type { ParticipantTableFeatures } from './tableFeatures';
	import SideDrawer from './SideDrawer.svelte';
	import ColumnCategoryGroups from './ColumnCategoryGroups.svelte';

	interface Props {
		open: boolean;
		table: Table<ParticipantTableFeatures, ParticipantRow>;
		onVisibilityChange: (state: ColumnVisibilityState) => void;
	}

	let { open = $bindable(), table, onVisibilityChange }: Props = $props();

	const allColumns = $derived(
		table.getAllColumns().flatMap((col) => {
			const meta = col.columnDef.meta;
			return meta ? [{ col, meta }] : [];
		})
	);

	function showAll() {
		const state: ColumnVisibilityState = {};
		for (const { col } of allColumns) {
			state[col.id] = true;
		}
		onVisibilityChange(state);
	}

	function resetToDefaults() {
		const state: ColumnVisibilityState = {};
		for (const { col, meta } of allColumns) {
			state[col.id] = meta.defaultVisible;
		}
		onVisibilityChange(state);
	}

	function toggleColumn(columnId: string) {
		const col = table.getColumn(columnId);
		if (!col) return;
		const newVisibility = !col.getIsVisible();
		const currentState = table.atoms.columnVisibility.get();
		const newState = { ...currentState, [columnId]: newVisibility };
		onVisibilityChange(newState);
	}
</script>

<SideDrawer bind:open title={m.columnConfiguration()} icon="fa-columns">
	<div class="flex gap-2">
		<button class="btn btn-ghost btn-sm" onclick={showAll}>
			<i class="fa-duotone fa-eye"></i>
			{m.showAll()}
		</button>
		<button class="btn btn-ghost btn-sm" onclick={resetToDefaults}>
			<i class="fa-duotone fa-arrow-rotate-left"></i>
			{m.resetToDefaults()}
		</button>
	</div>

	<ColumnCategoryGroups entries={allColumns} listClass="flex flex-col gap-1">
		{#snippet item({ col, meta: colMeta }, header)}
			<label class="label cursor-pointer justify-start gap-3 py-1">
				<input
					type="checkbox"
					class="checkbox checkbox-sm checkbox-primary"
					checked={col.getIsVisible()}
					onchange={() => toggleColumn(col.id)}
				/>
				<div class="flex flex-col">
					<span class="label-text">{header}</span>
					{#if colMeta.description !== header}
						<span class="text-xs text-base-content/50">{colMeta.description}</span>
					{/if}
				</div>
			</label>
		{/snippet}
	</ColumnCategoryGroups>
</SideDrawer>
