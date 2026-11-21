<script lang="ts">
	import type { Snippet } from 'svelte';
	import { calloutClass, calloutIcon } from '#lib/guide/blocks';
	import type { GuideNode } from '#lib/guide/document';

	/** A tinted note with its Phosphor icon. */
	let { node, children }: { node: GuideNode; children?: Snippet } = $props();

	const icon = $derived(calloutIcon(node.attrs?.icon));
</script>

<div class="alert not-prose my-4 items-start {calloutClass(node.attrs?.color)}" role="note">
	<i class="ph-duotone ph-{icon} text-2xl" aria-hidden="true"></i>
	<div class="prose prose-sm max-w-none">{@render children?.()}</div>
</div>
