<script lang="ts">
	import { optionList } from '#lib/dataGrid/operators';

	/** Any number of the column's values, as toggles. */
	interface Props {
		value: unknown;
		options: readonly { value: string; label: string }[];
		onchange: (value: string[]) => void;
	}

	let { value, options, onchange }: Props = $props();

	const chosen = $derived(optionList(value));

	function toggle(option: string) {
		onchange(
			chosen.includes(option) ? chosen.filter((item) => item !== option) : [...chosen, option]
		);
	}
</script>

<div class="flex flex-wrap gap-1">
	{#each options as option (option.value)}
		{@const active = chosen.includes(option.value)}
		<button
			type="button"
			class="btn btn-xs {active ? 'btn-primary' : 'btn-outline'}"
			aria-pressed={active}
			onclick={() => toggle(option.value)}
		>
			{option.label}
		</button>
	{/each}
</div>
