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

<div class="card bg-base-100 p-8 shadow-md dark:bg-base-200 {class_}">
	{#if title}
		<h2 class="card-title mb-2">{title}</h2>
	{/if}
	{#if description}
		<p class="mb-4 text-sm">{description}</p>
	{/if}
	{@render children()}
</div>
