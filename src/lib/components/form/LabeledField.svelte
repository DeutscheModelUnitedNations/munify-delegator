<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';

	/** A fieldset with a legend around one input, or around a textarea when `multiline` is set. */
	interface Props {
		label: string;
		value: string;
		multiline?: boolean;
		type?: HTMLInputAttributes['type'];
		required?: boolean;
	}

	let { label, value = $bindable(), multiline = false, type = 'text', required }: Props = $props();
</script>

<fieldset class="fieldset">
	<legend class="fieldset-legend">{label}</legend>
	{#if multiline}
		<textarea bind:value class="textarea w-full"></textarea>
	{:else}
		<input {type} bind:value class="input w-full" {required} />
	{/if}
</fieldset>
