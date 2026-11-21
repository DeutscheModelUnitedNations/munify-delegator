<script lang="ts">
	import type { BoxPlacement } from '#lib/helpers/documentLayout';
	import type { PaperMark } from '#lib/paperScan/fields';

	/**
	 * A field read off a scan, on the layout editor's page: a box to tick, drawn as its frame, or a
	 * line to write on (a signature, place and date), drawn along the bottom of its area. A box is
	 * labelled beside it, a line inside. Moved and resized from its corner.
	 */
	interface Props {
		label: string;
		placement: BoxPlacement;
		mark: PaperMark;
		/** Pixels per point. */
		scale: number;
		onmove: (event: PointerEvent) => void;
		onresize: (event: PointerEvent) => void;
	}

	let { label, placement, mark, scale, onmove, onresize }: Props = $props();
</script>

<div
	class="bg-info/10 absolute cursor-move text-black {mark === 'checkbox'
		? 'border border-black'
		: 'border-info border-b-2 border-dashed border-b-black'}"
	style="left: {placement.x * 100}%; top: {placement.y * 100}%; width: {placement.width *
		100}%; height: {placement.height * 100}%;"
	role="button"
	tabindex="-1"
	aria-label={label}
	title={label}
	onpointerdown={onmove}
>
	{#if mark === 'line'}
		<span class="absolute top-0 left-1 truncate text-black/60" style="font-size: {7 * scale}px;"
			>{label}</span
		>
	{:else}
		<!-- beside the box, which is too small to hold it; the template's own text stays visible -->
		<span
			class="bg-info text-info-content pointer-events-none absolute top-1/2 rounded-sm px-1 whitespace-nowrap shadow-sm"
			style="left: calc(100% + {3 * scale}px); transform: translateY(-50%); font-size: {7 *
				scale}px;">{label}</span
		>
	{/if}
	<span
		class="bg-info absolute right-0 bottom-0 h-2 w-2 cursor-nwse-resize"
		role="presentation"
		onpointerdown={onresize}
	></span>
</div>
