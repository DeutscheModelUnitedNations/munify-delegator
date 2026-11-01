<script lang="ts">
	import type { SquarePlacement } from '#lib/helpers/documentLayout';

	/** A code on the layout editor's page, square, its caption above, resized from its corner. */
	interface Props {
		label: string;
		placement: SquarePlacement;
		captions: string[];
		/** Pixels per point. */
		scale: number;
		onmove: (event: PointerEvent) => void;
		onresize: (event: PointerEvent) => void;
	}

	let { label, placement, captions, scale, onmove, onresize }: Props = $props();
</script>

<div
	class="border-accent bg-accent/10 absolute flex cursor-move items-center justify-center border border-dashed text-black"
	style="left: {placement.x * 100}%; top: {placement.y * 100}%; width: {placement.size *
		100}%; aspect-ratio: 1;"
	role="button"
	tabindex="-1"
	aria-label={label}
	title={label}
	onpointerdown={onmove}
>
	{#each captions as caption, index (index)}
		<span
			class="absolute -top-1 left-1/2 -translate-x-1/2 -translate-y-full whitespace-nowrap"
			style="font-size: {8 * scale}px;">{caption}</span
		>
	{/each}
	<i class="fa-sharp-duotone fa-solid fa-qrcode text-2xl"></i>
	<span
		class="bg-accent absolute right-0 bottom-0 h-3 w-3 cursor-nwse-resize"
		role="presentation"
		onpointerdown={onresize}
	></span>
</div>
