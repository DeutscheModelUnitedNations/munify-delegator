<script lang="ts">
	import type { ShownMark } from './pageCamera.svelte';

	interface Props {
		/** The page's corner marks as the camera sees them, as shares of the picture. */
		marks: ShownMark[];
	}

	let { marks }: Props = $props();
</script>

<!-- a ring on each mark seen, a dashed one where a missing one should be -->
{#each marks as mark (mark.corner)}
	<span
		class="pointer-events-none absolute size-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 {mark.seen
			? 'border-success'
			: 'border-error border-dashed'}"
		style="left: {mark.at.x * 100}%; top: {mark.at.y * 100}%;"
	></span>
{/each}
