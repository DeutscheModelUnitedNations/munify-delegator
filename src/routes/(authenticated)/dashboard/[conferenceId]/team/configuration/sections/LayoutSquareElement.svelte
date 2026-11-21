<script lang="ts">
	import type { SquarePlacement } from '#lib/helpers/documentLayout';

	/**
	 * A code on the layout editor's page, square, resized from its corner. Its captions go above it
	 * (the certificate's) or beside it at its bottom, the last line lowest (the documents' footer).
	 */
	interface Props {
		label: string;
		placement: SquarePlacement;
		captions: string[];
		caption: 'above' | 'beside';
		/** Pixels per point. */
		scale: number;
		onmove: (event: PointerEvent) => void;
		onresize: (event: PointerEvent) => void;
	}

	let { label, placement, captions, caption, scale, onmove, onresize }: Props = $props();
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
	{#if caption === 'above'}
		{#each captions as text, index (index)}
			<span
				class="absolute -top-1 left-1/2 -translate-x-1/2 -translate-y-full whitespace-nowrap"
				style="font-size: {8 * scale}px;">{text}</span
			>
		{/each}
	{:else}
		<span
			class="absolute bottom-0 flex flex-col items-end whitespace-nowrap"
			style="right: calc(100% + {5 * scale}px); font-size: {8 * scale}px; line-height: {10 *
				scale}px;"
		>
			{#each captions as text, index (index)}
				<span>{text}</span>
			{/each}
		</span>
	{/if}
	<i aria-hidden="true" class="ph-duotone ph-qr-code text-2xl"></i>
	<span
		class="bg-accent absolute right-0 bottom-0 h-3 w-3 cursor-nwse-resize"
		role="presentation"
		onpointerdown={onresize}
	></span>
</div>
