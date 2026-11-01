<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		/** Tooltip text; without one the content renders bare, with no wrapper element. */
		tip?: string | null;
		class?: string;
		children: Snippet;
	}

	let { tip, class: className = '', children }: Props = $props();
</script>

{#if tip}
	<div class="tooltip {className}" data-tip={tip}>
		{@render children()}
	</div>
{:else}
	{@render children()}
{/if}
