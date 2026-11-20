<script lang="ts">
	import type { Snippet } from 'svelte';
	import { calloutClass } from '#lib/guide/blocks';
	import type { GuideNode } from '#lib/guide/document';

	/** A tinted note with its emoji. */
	let { node, children }: { node: GuideNode; children?: Snippet } = $props();

	const emoji = $derived(typeof node.attrs?.emoji === 'string' ? node.attrs.emoji : '');
</script>

<div class="alert not-prose my-4 items-start {calloutClass(node.attrs?.color)}" role="note">
	{#if emoji}<span class="text-xl" aria-hidden="true">{emoji}</span>{/if}
	<div class="prose prose-sm max-w-none">{@render children?.()}</div>
</div>
