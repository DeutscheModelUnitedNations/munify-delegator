<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		title: string;
		fontAwesomeIcon?: string;
		children?: Snippet;
		content?: string | number | null;
	}

	let { title, fontAwesomeIcon, children, content: textContent }: Props = $props();
</script>

{#snippet Content()}
	{#if textContent}
		{textContent}
	{:else if children}
		{@render children?.()}
	{:else}
		<i class="fa-sharp-duotone fa-solid fa-dash"></i>
	{/if}
{/snippet}

<fieldset class="fieldset bg-base-200 border-base-300 rounded-box w-full border p-4">
	<legend class="fieldset-legend">
		{#if fontAwesomeIcon}
			<i class="fa-sharp-duotone fa-solid fa-{fontAwesomeIcon.replace('fa-', '')}"></i>
		{/if}
		{title}
	</legend>

	<div class="flex flex-col gap-2 text-sm">
		{@render Content()}
	</div>
</fieldset>
