<script lang="ts">
	import { getLocale } from '#lib/paraglide/runtime';
	import { m } from '#lib/paraglide/messages';

	/** A month of any year, 1 to 12. */
	interface Props {
		value: unknown;
		onchange: (value: number) => void;
	}

	let { value, onchange }: Props = $props();

	const months = $derived(
		Array.from({ length: 12 }, (_, i) => ({
			value: i + 1,
			label: new Intl.DateTimeFormat(getLocale(), { month: 'long' }).format(new Date(2000, i, 1))
		}))
	);
</script>

<select
	class="select select-bordered select-sm w-full"
	aria-label={m.dataGridMonth()}
	value={typeof value === 'number' ? value : ''}
	onchange={(event) => onchange(Number(event.currentTarget.value))}
>
	<option value="" disabled>{m.dataGridMonth()}</option>
	{#each months as month (month.value)}
		<option value={month.value}>{month.label}</option>
	{/each}
</select>
