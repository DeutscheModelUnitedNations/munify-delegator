<script lang="ts">
	import type { SnapGuides } from '#lib/helpers/layoutSnap';

	/** The lines a dragged element lines up along, across the layout editor's page. */
	interface Props {
		guides: SnapGuides;
	}

	let { guides }: Props = $props();
</script>

{#each guides.vertical as x (x)}
	<div
		aria-hidden="true"
		class="border-primary pointer-events-none absolute top-0 bottom-0 z-10 border-l border-dashed"
		style="left: {x * 100}%;"
	></div>
{/each}
{#each guides.horizontal as y (y)}
	<div
		aria-hidden="true"
		class="border-primary pointer-events-none absolute right-0 left-0 z-10 border-t border-dashed"
		style="top: {y * 100}%;"
	></div>
{/each}
