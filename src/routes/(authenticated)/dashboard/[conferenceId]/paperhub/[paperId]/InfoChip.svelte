<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		icon?: string;
		startContent?: Snippet;
		textContent?: string;
		endContent?: Snippet;
		tooltip?: string;
	}

	let { icon, startContent, textContent, endContent, tooltip }: Props = $props();
</script>

<div
	class="flex items-center gap-2 p-2 bg-base-200 rounded-box {tooltip ? 'tooltip' : ''}"
	data-tip={tooltip}
>
	{#if icon}
		<i class="fa-solid fa-{icon.replace('fa-', '')} text-lg"></i>
	{/if}
	{@render startContent?.()}
	{#if textContent}
		<h3 class="text-md">
			{textContent}
		</h3>
	{/if}
	{@render endContent?.()}
</div>
