<script lang="ts" generics="Row">
	import { m } from '#lib/paraglide/messages';
	import { isFilterable } from '#lib/dataGrid/columnTypes';
	import {
		addItem,
		addToGroup,
		canAddItem,
		newCondition,
		removeItem,
		replaceCondition,
		setConnective
	} from '#lib/dataGrid/filterEdit';
	import type { FilterRoot } from '#lib/dataGrid/stateSchema';
	import type { GridColumn } from '../gridColumn';
	import FilterConditionRow from './FilterConditionRow.svelte';
	import FilterConnector from './FilterConnector.svelte';
	import FilterGroupBox from './FilterGroupBox.svelte';

	/**
	 * The filter builder: conditions and groups of conditions, joined by AND or OR - one level of
	 * groups, as in the member table of the Mitgliedshub. Every edit is handed on whole
	 * (`onchange`); conditions that do not count yet filter nothing (`#lib/dataGrid/filterEdit`).
	 */
	interface Props {
		filter: FilterRoot;
		columns: readonly GridColumn<Row>[];
		onchange: (filter: FilterRoot) => void;
	}

	let { filter, columns, onchange }: Props = $props();

	const filterable = $derived(columns.filter(isFilterable));
	const canAdd = $derived(canAddItem(filter) && filterable.length > 0);
</script>

<div class="flex flex-col gap-1">
	{#if filter.items.length === 0}
		<p class="text-base-content/60 py-4 text-center text-sm">{m.dataGridNoFilter()}</p>
	{/if}
	{#each filter.items as item, index (index)}
		{#if index > 0}
			<FilterConnector op={filter.op} onchange={(op) => onchange(setConnective({ filter, op }))} />
		{/if}
		{#if item.type === 'condition'}
			<FilterConditionRow
				condition={item}
				columns={filterable}
				onchange={(condition) =>
					onchange(replaceCondition({ filter, address: { index }, condition }))}
				onremove={() => onchange(removeItem({ filter, address: { index } }))}
			/>
		{:else}
			<FilterGroupBox
				group={item}
				columns={filterable}
				{canAdd}
				onconnective={(op) => onchange(setConnective({ filter, index, op }))}
				onchange={({ inner, condition }) =>
					onchange(replaceCondition({ filter, address: { index, inner }, condition }))}
				onadd={(condition) => onchange(addToGroup({ filter, index, condition }))}
				onremove={(inner) => onchange(removeItem({ filter, address: { index, inner } }))}
			/>
		{/if}
	{/each}
	<div class="mt-2 flex flex-wrap gap-2">
		<button
			class="btn btn-sm btn-outline"
			disabled={!canAdd}
			onclick={() => onchange(addItem({ filter, item: newCondition(filterable[0]) }))}
		>
			<i class="ph-duotone ph-plus"></i>
			{m.dataGridAddCondition()}
		</button>
		<button
			class="btn btn-sm btn-ghost"
			disabled={!canAdd}
			onclick={() =>
				onchange(
					addItem({
						filter,
						item: {
							type: 'group',
							op: filter.op === 'and' ? 'or' : 'and',
							items: [newCondition(filterable[0])]
						}
					})
				)}
		>
			<i class="ph-duotone ph-stack-plus"></i>
			{m.dataGridAddGroup()}
		</button>
	</div>
</div>
