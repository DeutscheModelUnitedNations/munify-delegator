<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		children,
		tourAnchor
	}: {
		children: Snippet;
		/** Where a guided tour points at the tabs (`data-tour`, see `#lib/docs/tours`) */
		tourAnchor?: string;
	} = $props();
</script>

<div
	role="tablist"
	class="tabs tabs-border sm:tabs-lg mb-6 max-w-full flex-nowrap overflow-x-auto"
	data-tour={tourAnchor}
>
	{@render children()}
</div>
