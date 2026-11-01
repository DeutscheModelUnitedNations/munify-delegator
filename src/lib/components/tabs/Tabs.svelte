<script lang="ts">
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();
</script>

<div role="tablist" class="tabs tabs-border sm:tabs-lg mb-6 max-w-full flex-nowrap overflow-x-auto">
	{@render children()}
</div>
