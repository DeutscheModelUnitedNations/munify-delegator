<script lang="ts" generics="TData extends object">
	import { m } from '$lib/paraglide/messages';
	import type { ColumnVisibilityState, Table } from '$lib/components/tanStackTable';
	import {
		columnHeaderOf,
		columnIdOf,
		defaultColumnVisibility,
		type ManagedColumn,
		type ManagedTableFeatures
	} from '$lib/components/tanStackTable/managedTable';
	import SideDrawer from './SideDrawer.svelte';
	import ColumnGroups from './ColumnGroups.svelte';

	interface Props {
		open: boolean;
		table: Table<ManagedTableFeatures, TData>;
		columns: ManagedColumn<TData>[];
		groupOrder?: string[];
		onVisibilityChange: (state: ColumnVisibilityState) => void;
	}

	let { open = $bindable(), table, columns, groupOrder, onVisibilityChange }: Props = $props();

	/** The columns that have a heading to show them by, the actions column of a table has none. */
	const entries = $derived(
		columns.flatMap((def) => {
			const id = columnIdOf(def);
			const col = id === undefined ? undefined : table.getColumn(id);
			const header = columnHeaderOf(def);
			return col && header
				? [{ id: col.id, col, header, group: def.group, description: def.description }]
				: [];
		})
	);

	function showAll() {
		const state: ColumnVisibilityState = {};
		for (const { id } of entries) state[id] = true;
		onVisibilityChange(state);
	}

	function resetToDefaults() {
		const state: ColumnVisibilityState = {};
		for (const { id } of entries) state[id] = true;
		onVisibilityChange({ ...state, ...defaultColumnVisibility(columns) });
	}

	function toggleColumn(columnId: string) {
		const col = table.getColumn(columnId);
		if (!col) return;
		const currentState = table.atoms.columnVisibility.get();
		onVisibilityChange({ ...currentState, [columnId]: !col.getIsVisible() });
	}
</script>

<SideDrawer bind:open title={m.columnConfiguration()} icon="fa-columns">
	<div class="flex gap-2">
		<button class="btn btn-ghost btn-sm" onclick={showAll}>
			<i class="fa-sharp-duotone fa-solid fa-eye"></i>
			{m.showAll()}
		</button>
		<button class="btn btn-ghost btn-sm" onclick={resetToDefaults}>
			<i class="fa-sharp-duotone fa-solid fa-arrow-rotate-left"></i>
			{m.resetToDefaults()}
		</button>
	</div>

	<ColumnGroups {entries} {groupOrder} listClass="flex flex-col gap-1">
		{#snippet item({ id, col, header, description })}
			<label class="label cursor-pointer justify-start gap-3 py-1">
				<input
					type="checkbox"
					class="checkbox checkbox-sm checkbox-primary"
					checked={col.getIsVisible()}
					onchange={() => toggleColumn(id)}
				/>
				<div class="flex flex-col">
					<span class="label-text">{header}</span>
					{#if description && description !== header}
						<span class="text-xs text-base-content/50">{description}</span>
					{/if}
				</div>
			</label>
		{/snippet}
	</ColumnGroups>
</SideDrawer>
