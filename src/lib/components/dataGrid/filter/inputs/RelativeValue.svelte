<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import { RELATIVE_UNITS, isRelative, type Relative } from '#lib/dataGrid/operators';
	import { RELATIVE_UNIT_LABELS } from '../../labels';

	/** "3 months": an amount and a unit. */
	interface Props {
		value: unknown;
		onchange: (value: Relative) => void;
	}

	let { value, onchange }: Props = $props();

	const current = $derived<Relative>(isRelative(value) ? value : { amount: 1, unit: 'months' });
</script>

<div class="flex items-center gap-2">
	<input
		type="number"
		min="0"
		class="input input-bordered input-sm w-20"
		aria-label={m.dataGridAmount()}
		value={isRelative(value) ? value.amount : ''}
		onchange={(event) =>
			onchange({ ...current, amount: Math.max(0, Math.floor(Number(event.currentTarget.value))) })}
	/>
	<select
		class="select select-bordered select-sm"
		aria-label={m.dataGridUnit()}
		value={current.unit}
		onchange={(event) => {
			const unit = RELATIVE_UNITS.find((candidate) => candidate === event.currentTarget.value);
			if (unit) onchange({ ...current, unit });
		}}
	>
		{#each RELATIVE_UNITS as unit (unit)}
			<option value={unit}>{RELATIVE_UNIT_LABELS[unit]()}</option>
		{/each}
	</select>
</div>
