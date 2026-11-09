<script lang="ts">
	import type { Snippet } from 'svelte';
	import { m } from '#lib/paraglide/messages';

	/** How often the person took part in a conference before; `none` when never. */
	let { count, none }: { count: number | null | undefined; none?: Snippet } = $props();
</script>

{#if count}
	<span class="text-warning" title={m.assignmentPreviousParticipations()}>
		<i aria-hidden="true" class="ph-duotone ph-arrow-counter-clockwise"></i>
		{count}
	</span>
{:else}
	{@render none?.()}
{/if}
