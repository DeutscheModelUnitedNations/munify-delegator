<script lang="ts" generics="Row">
	import { m } from '#lib/paraglide/messages';
	import {
		changeColumn,
		changeOperator,
		conditionProblem,
		type ConditionProblem
	} from '#lib/dataGrid/filterEdit';
	import { findOperator, operatorsFor } from '#lib/dataGrid/operators';
	import type { FilterCondition } from '#lib/dataGrid/stateSchema';
	import type { GridColumn } from '../gridColumn';
	import { operatorLabel } from '../labels';
	import ColumnSelect from './ColumnSelect.svelte';
	import FilterValueInput from './FilterValueInput.svelte';

	/** One condition: column, operator, value - and why it does not count yet, if it does not. */
	interface Props {
		condition: FilterCondition;
		/** The columns the filter can name */
		columns: readonly GridColumn<Row>[];
		onchange: (condition: FilterCondition) => void;
		onremove: () => void;
	}

	let { condition, columns, onchange, onremove }: Props = $props();

	const column = $derived(columns.find((candidate) => candidate.id === condition.column));
	const operator = $derived(
		column ? findOperator({ type: column.type, id: condition.operator }) : undefined
	);
	const problem = $derived(conditionProblem({ condition, columns }));

	const PROBLEMS: Record<ConditionProblem, () => string> = {
		unknownColumn: m.dataGridProblemColumn,
		unknownOperator: m.dataGridProblemOperator,
		incomplete: m.dataGridProblemIncomplete
	};
</script>

<div class="flex flex-col gap-1">
	<div class="flex flex-wrap items-center gap-2 sm:flex-nowrap">
		<div class="w-full sm:w-44 sm:shrink-0">
			<ColumnSelect
				{columns}
				value={column?.id}
				label={m.dataGridColumn()}
				placeholder={m.dataGridChooseColumn()}
				onchange={(next) => onchange(changeColumn({ condition, current: column, next }))}
			/>
		</div>
		{#if column}
			<select
				class="select select-bordered select-sm w-full sm:w-40 sm:shrink-0"
				aria-label={m.dataGridOperator()}
				value={condition.operator}
				onchange={(event) =>
					onchange(changeOperator({ condition, column, operator: event.currentTarget.value }))}
			>
				{#each operatorsFor(column.type) as option (option.id)}
					<option value={option.id}>{operatorLabel(option.id)}</option>
				{/each}
			</select>
			{#if operator && operator.input !== 'none'}
				<div class="w-full min-w-0 grow">
					{#key `${condition.column}:${operator.input}`}
						<FilterValueInput
							{column}
							input={operator.input}
							value={condition.value}
							onchange={(value) => onchange({ ...condition, value })}
						/>
					{/key}
				</div>
			{/if}
		{/if}
		<button
			class="btn btn-ghost btn-sm btn-square shrink-0"
			aria-label={m.dataGridRemoveCondition()}
			onclick={onremove}
		>
			<i class="ph-duotone ph-x"></i>
		</button>
	</div>
	{#if problem}
		<p class="text-base-content/60 text-xs">
			<i class="ph-duotone ph-info"></i>
			{PROBLEMS[problem]()}
		</p>
	{/if}
</div>
