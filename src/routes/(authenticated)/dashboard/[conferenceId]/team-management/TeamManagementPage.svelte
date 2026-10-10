<script lang="ts">
	import type { Snippet } from 'svelte';

	/** The padded content area of a team management page, below the tabs. */
	let { children }: { children: Snippet } = $props();
</script>

<div class="flex flex-col gap-4 p-6 pt-4">
	{@render children()}
</div>
