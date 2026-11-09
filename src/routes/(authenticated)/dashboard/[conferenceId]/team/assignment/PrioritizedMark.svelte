<script lang="ts">
	import { m } from '#lib/paraglide/messages';

	/** Marks the wish the sighting prioritized; renders nothing for any other. */
	let { show }: { show: boolean | undefined } = $props();
</script>

{#if show}
	<i
		aria-hidden="true"
		class="ph-duotone ph-target text-primary shrink-0"
		role="img"
		aria-label={m.assignmentPrioritized()}
		title={m.assignmentPrioritized()}
	></i>
{/if}
