<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		title: string;
		/** A pictogram shown before the title. */
		icon?: Snippet;
		children: Snippet;
	}

	let { title, icon, children }: Props = $props();
</script>

<fieldset class="fieldset bg-base-200 border-base-300 rounded-box w-full border p-4">
	<legend class="fieldset-legend">
		{#if icon}{@render icon()}{/if}
		{title}
	</legend>
	{@render children()}
</fieldset>
