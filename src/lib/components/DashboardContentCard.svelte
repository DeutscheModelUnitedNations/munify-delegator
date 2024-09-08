<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		title?: string;
		description?: string;
		class?: string;
		children: Snippet;
	}

	let { title, description, class: class_, children }: Props = $props();
</script>

<div class="card bg-base-100 dark:bg-base-200 shadow-md p-8 {class_}">
	{#if title}
		<h2 class="card-title mb-2">{title}</h2>
	{/if}
	{#if description}
		<p class="text-sm mb-4">{description}</p>
	{/if}
	{@render children()}
</div>
