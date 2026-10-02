<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		title: string;
		/** Rendered as HTML: pass only a translation string from `m`, never user or database content. */
		description: string;
		children: Snippet;
	}

	let { title, description, children }: Props = $props();
</script>

<div class="flex flex-col gap-2">
	<h3 class="text-xl font-bold">{title}</h3>
	<!-- eslint-disable-next-line svelte/no-at-html-tags -- trusted: every caller passes a translation string authored in messages/ -->
	<p>{@html description}</p>
	{@render children()}
</div>
