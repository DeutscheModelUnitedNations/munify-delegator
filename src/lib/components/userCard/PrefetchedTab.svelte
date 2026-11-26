<script lang="ts">
	import type { Snippet } from 'svelte';
	import TabReady from './TabReady.svelte';

	/**
	 * A tab loaded in the background, out of sight. One that fails here is skipped: it shows its own
	 * error when it is opened.
	 */
	let { onready, children }: { onready: () => void; children: Snippet } = $props();
</script>

<div hidden inert>
	<svelte:boundary onerror={onready}>
		{@render children()}
		<TabReady {onready} />

		{#snippet pending()}{/snippet}
		{#snippet failed()}{/snippet}
	</svelte:boundary>
</div>
