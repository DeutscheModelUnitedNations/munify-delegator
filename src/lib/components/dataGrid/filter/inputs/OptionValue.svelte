<script lang="ts">
	import { m } from '#lib/paraglide/messages';

	/** One of the column's values. */
	interface Props {
		value: unknown;
		options: readonly { value: string; label: string }[];
		onchange: (value: string) => void;
	}

	let { value, options, onchange }: Props = $props();
</script>

<select
	class="select select-bordered select-sm w-full"
	aria-label={m.dataGridValue()}
	value={typeof value === 'string' ? value : ''}
	onchange={(event) => onchange(event.currentTarget.value)}
>
	<option value="" disabled>{m.dataGridChoose()}</option>
	{#each options as option (option.value)}
		<option value={option.value}>{option.label}</option>
	{/each}
</select>
