<script lang="ts">
	import type { BoxPlacement } from '#lib/helpers/documentLayout.js';

	/** An area on the layout editor's page, its sample content inside, resized from its corner. */
	interface Props {
		label: string;
		placement: BoxPlacement;
		lines: string[];
		/** Pixels per point. */
		scale: number;
		onmove: (event: PointerEvent) => void;
		onresize: (event: PointerEvent) => void;
	}

	let { label, placement, lines, scale, onmove, onresize }: Props = $props();
</script>

<div
	class="border-secondary bg-secondary/10 absolute cursor-move overflow-hidden border border-dashed p-1 text-black"
	style="left: {placement.x * 100}%; top: {placement.y * 100}%; width: {placement.width *
		100}%; height: {placement.height * 100}%; font-size: {9 * scale}px;"
	role="button"
	tabindex="-1"
	aria-label={label}
	title={label}
	onpointerdown={onmove}
>
	<p class="text-center font-bold">{label}</p>
	<ul class="flex flex-col items-center">
		{#each lines as line, index (index)}
			<li>✓ {line}</li>
		{/each}
	</ul>
	<span
		class="bg-secondary absolute right-0 bottom-0 h-3 w-3 cursor-nwse-resize"
		role="presentation"
		onpointerdown={onresize}
	></span>
</div>
