<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import { dayBounds, numberBounds } from '#lib/dataGrid/operators';
	import DateValue from './DateValue.svelte';
	import NumberValue from './NumberValue.svelte';

	/** A range with either end open: `{ from, to }` of numbers or days. */
	interface Props {
		kind: 'number' | 'date';
		value: unknown;
		onchange: (value: { from: number | string | null; to: number | string | null }) => void;
	}

	let { kind, value, onchange }: Props = $props();

	const bounds = $derived(kind === 'number' ? numberBounds(value) : dayBounds(value));
	const from = $derived(bounds.from ?? null);
	const to = $derived(bounds.to ?? null);
</script>

<div class="flex items-center gap-2">
	{#if kind === 'number'}
		<NumberValue
			value={from}
			placeholder={m.dataGridFrom()}
			onchange={(next) => onchange({ from: next, to })}
		/>
		<span class="text-base-content/60">–</span>
		<NumberValue
			value={to}
			placeholder={m.dataGridTo()}
			onchange={(next) => onchange({ from, to: next })}
		/>
	{:else}
		<DateValue
			value={from}
			label={m.dataGridFrom()}
			onchange={(next) => onchange({ from: next, to })}
		/>
		<span class="text-base-content/60">–</span>
		<DateValue
			value={to}
			label={m.dataGridTo()}
			onchange={(next) => onchange({ from, to: next })}
		/>
	{/if}
</div>
