<script lang="ts">
	import type { Snippet } from 'svelte';
	import { m } from '#lib/paraglide/messages';
	import type { GuideNode } from '#lib/guide/document';

	/** A collapsible block, closed until the reader opens it. */
	let { node, children }: { node: GuideNode; children?: Snippet } = $props();

	const summary = $derived(
		typeof node.attrs?.summary === 'string' && node.attrs.summary
			? node.attrs.summary
			: m.guideToggleOpen()
	);
</script>

<details
	class="collapse-arrow bg-base-200 rounded-box border-base-300 not-prose collapse my-2 border"
>
	<summary class="collapse-title font-semibold">{summary}</summary>
	<div class="collapse-content prose prose-sm max-w-none">
		{@render children?.()}
	</div>
</details>
