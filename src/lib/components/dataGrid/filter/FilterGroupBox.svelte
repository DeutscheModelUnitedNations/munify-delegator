<script lang="ts" generics="Row">
	import { m } from '#lib/paraglide/messages';
	import { newCondition } from '#lib/dataGrid/filterEdit';
	import type { Connective, FilterCondition, FilterGroup } from '#lib/dataGrid/stateSchema';
	import type { GridColumn } from '../gridColumn';
	import FilterConditionRow from './FilterConditionRow.svelte';
	import FilterConnector from './FilterConnector.svelte';

	/** A group of conditions with a connective of its own: "(A or B)" inside the filter. */
	interface Props {
		group: FilterGroup;
		columns: readonly GridColumn<Row>[];
		canAdd: boolean;
		onconnective: (op: Connective) => void;
		onchange: (args: { inner: number; condition: FilterCondition }) => void;
		onadd: (condition: FilterCondition) => void;
		onremove: (inner?: number) => void;
	}

	let { group, columns, canAdd, onconnective, onchange, onadd, onremove }: Props = $props();
</script>

<div class="border-base-300 bg-base-200/40 rounded-box flex flex-col gap-1 border p-3">
	<div class="flex items-center justify-between">
		<span class="text-base-content/70 text-xs font-semibold uppercase">{m.dataGridGroup()}</span>
		<button
			class="btn btn-ghost btn-xs"
			aria-label={m.dataGridRemoveGroup()}
			onclick={() => onremove()}
		>
			<i class="ph-duotone ph-trash"></i>
		</button>
	</div>
	{#each group.items as condition, inner (inner)}
		{#if inner > 0}
			<FilterConnector op={group.op} onchange={onconnective} />
		{/if}
		<FilterConditionRow
			{condition}
			{columns}
			onchange={(next) => onchange({ inner, condition: next })}
			onremove={() => onremove(inner)}
		/>
	{/each}
	<button
		class="btn btn-ghost btn-xs mt-1 self-start"
		disabled={!canAdd || columns.length === 0}
		onclick={() => onadd(newCondition(columns[0]))}
	>
		<i class="ph-duotone ph-plus"></i>
		{m.dataGridAddCondition()}
	</button>
</div>
