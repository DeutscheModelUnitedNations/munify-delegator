<script lang="ts">
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();
</script>

<div role="tablist" class="tabs tabs-lift tabs-lg mb-6">
	{@render children()}
</div>
