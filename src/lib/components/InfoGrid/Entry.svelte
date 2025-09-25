<script lang="ts">
	import type { Snippet } from 'svelte';
	import Divider from './Divider.svelte';

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
		<i class="fa-duotone fa-dash"></i>
	{/if}
{/snippet}

<fieldset class="fieldset bg-base-200 border-base-300 rounded-box w-full border p-4 sm:hidden">
	<legend class="fieldset-legend">
		{#if fontAwesomeIcon}
			<i class="fa-duotone fa-{fontAwesomeIcon.replace('fa-', '')}"></i>
		{/if}
		{title}
	</legend>

	<div class="flex flex-col gap-2 text-sm">
		{@render Content()}
	</div>
</fieldset>

<div class="ml-8 hidden items-center gap-2 text-sm sm:flex">
	{#if fontAwesomeIcon}
		<i class="fa-duotone fa-{fontAwesomeIcon.replace('fa-', '')} mr-2 w-6 text-center"></i>
	{/if}
	{title}
</div>

<div class="mr-8 hidden flex-col justify-center gap-2 text-sm sm:flex">
	{@render Content()}
</div>

<!-- Divider -->
<Divider />
