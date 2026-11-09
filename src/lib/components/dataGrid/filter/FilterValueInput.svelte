<script lang="ts" generics="Row">
	import type { ValueInput } from '#lib/dataGrid/operators';
	import type { FilterCondition } from '#lib/dataGrid/stateSchema';
	import { optionLabelOf, type GridColumn } from '../gridColumn';
	import DateValue from './inputs/DateValue.svelte';
	import MonthValue from './inputs/MonthValue.svelte';
	import NumberValue from './inputs/NumberValue.svelte';
	import OptionsValue from './inputs/OptionsValue.svelte';
	import OptionValue from './inputs/OptionValue.svelte';
	import RangeValue from './inputs/RangeValue.svelte';
	import RelativeValue from './inputs/RelativeValue.svelte';
	import TextValue from './inputs/TextValue.svelte';

	/** The field a condition's value is entered in, as its operator's input asks. */
	interface Props {
		column: GridColumn<Row>;
		input: ValueInput;
		value: FilterCondition['value'];
		onchange: (value: FilterCondition['value']) => void;
	}

	let { column, input, value, onchange }: Props = $props();

	const options = $derived(
		(column.options ?? []).map((option) => ({
			value: option,
			label: optionLabelOf({ column, value: option })
		}))
	);
</script>

{#if input === 'text' || (input === 'option' && options.length === 0)}
	<TextValue {value} {onchange} />
{:else if input === 'number'}
	<NumberValue {value} {onchange} />
{:else if input === 'date'}
	<DateValue {value} {onchange} />
{:else if input === 'numberRange'}
	<RangeValue kind="number" {value} {onchange} />
{:else if input === 'dateRange'}
	<RangeValue kind="date" {value} {onchange} />
{:else if input === 'relative'}
	<RelativeValue {value} {onchange} />
{:else if input === 'month'}
	<MonthValue {value} {onchange} />
{:else if input === 'option'}
	<OptionValue {value} {options} {onchange} />
{:else if input === 'options'}
	<OptionsValue {value} {options} {onchange} />
{/if}
