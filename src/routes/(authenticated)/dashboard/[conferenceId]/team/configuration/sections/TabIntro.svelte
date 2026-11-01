<script lang="ts">
	import type { Snippet } from 'svelte';

	/** The one-line explanation at the top of a settings tab. */
	let { children }: { children: Snippet } = $props();
</script>

<p class="text-base-content/70 flex min-w-0 flex-1 items-center gap-2 text-sm">
	<i class="fa-sharp-duotone fa-solid fa-circle-info text-primary"></i>
	<span>{@render children()}</span>
</p>
