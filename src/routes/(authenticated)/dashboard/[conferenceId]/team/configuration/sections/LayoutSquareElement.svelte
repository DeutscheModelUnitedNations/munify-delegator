<script lang="ts">
	import { CODE_CAPTION } from '#lib/helpers/codeCaption';
	import type { SquarePlacement } from '#lib/helpers/documentLayout';

	/**
	 * A code on the layout editor's page, square, resized from its corner. Its captions go above it
	 * (the certificate's) or below it (the documents').
	 */
	interface Props {
		label: string;
		placement: SquarePlacement;
		captions: string[];
		caption: 'above' | 'below';
		/** Pixels per point. */
		scale: number;
		onmove: (event: PointerEvent) => void;
		onresize: (event: PointerEvent) => void;
		/** Picked in the editor: arrow keys move it. */
		selected?: boolean;
		/** Picks it (it got the focus). */
		onselect?: () => void;
	}

	let {
		label,
		placement,
		captions,
		caption,
		scale,
		onmove,
		onresize,
		selected = false,
		onselect
	}: Props = $props();
</script>

<div
	class="border-accent bg-accent/10 absolute flex cursor-move items-center justify-center border border-dashed text-black {selected
		? 'ring-primary ring-2'
		: ''}"
	style="left: {placement.x * 100}%; top: {placement.y * 100}%; width: {placement.size *
		100}%; aspect-ratio: 1;"
	role="button"
	tabindex="0"
	aria-label={label}
	aria-pressed={selected}
	title={label}
	onpointerdown={onmove}
	onfocus={onselect}
>
	<span
		class="absolute left-1/2 flex -translate-x-1/2 flex-col items-center whitespace-nowrap {caption ===
		'above'
			? 'bottom-full pb-1'
			: 'top-full'}"
		style="font-size: {(caption === 'above' ? 8 : CODE_CAPTION.size) *
			scale}px; line-height: {CODE_CAPTION.step * scale}px;"
	>
		{#each captions as text, index (index)}
			<span>{text}</span>
		{/each}
	</span>
	<i aria-hidden="true" class="ph-duotone ph-qr-code text-2xl"></i>
	<span
		class="bg-accent absolute right-0 bottom-0 h-3 w-3 cursor-nwse-resize"
		role="presentation"
		onpointerdown={onresize}
	></span>
</div>
