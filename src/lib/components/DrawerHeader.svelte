<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		category: string;
		title?: string;
		titleSnippet?: Snippet;
		id?: string;
		loading: boolean;
	}

	let { category, title, titleSnippet, id, loading }: Props = $props();
</script>

{#if loading}
	<div class="flex flex-col gap-2">
		<div class="skeleton h-8 w-1/2"></div>
		<div class="skeleton h-12 w-full"></div>
		<div class="skeleton h-6 w-1/3"></div>
	</div>
{:else}
	<div class="flex flex-col gap-2">
		<h3 class="text-xl font-thin uppercase">{category}</h3>
		<h2 class="rounded-md bg-base-300 p-2 text-3xl font-bold">
			{#if titleSnippet}
				{@render titleSnippet()}
			{:else}
				{title}
			{/if}
		</h2>
		<h3 class="text-sm font-thin">{id}</h3>
	</div>
{/if}
