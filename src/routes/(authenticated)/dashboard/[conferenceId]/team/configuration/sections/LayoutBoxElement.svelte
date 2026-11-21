<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import type { BoxPlacement } from '#lib/helpers/documentLayout';

	/**
	 * An area on the layout editor's page, its sample content inside: a checked list (the
	 * certificate's sessions) or one line right-aligned (a page number). Moved and resized from its
	 * corner; without `onmove` it is fixed, shown where it prints but not to be moved.
	 */
	interface Props {
		label: string;
		placement: BoxPlacement;
		lines: string[];
		list: boolean;
		/** Pixels per point. */
		scale: number;
		onmove?: (event: PointerEvent) => void;
		onresize?: (event: PointerEvent) => void;
	}

	let { label, placement, lines, list, scale, onmove, onresize }: Props = $props();
	const area = $derived(
		`left: ${placement.x * 100}%; top: ${placement.y * 100}%; width: ${placement.width * 100}%; height: ${placement.height * 100}%; font-size: ${9 * scale}px;`
	);
</script>

{#snippet content()}
	{#if list}
		<p class="font-bold">{label}</p>
		<ul class="flex flex-col">
			{#each lines as line, index (index)}
				<li>✓ {line}</li>
			{/each}
		</ul>
	{:else}
		<p class="flex justify-between gap-1 whitespace-nowrap" style="font-size: {7 * scale}px;">
			<span class="flex min-w-0 items-center gap-0.5 text-black/60">
				{#if !onmove}<i aria-hidden="true" class="ph-fill ph-lock-simple"></i>{/if}
				<span class="truncate">{label}</span>
			</span>
			<span style="font-size: {10 * scale}px;">{lines.join(' ')}</span>
		</p>
	{/if}
{/snippet}

{#if onmove}
	<div
		class="border-secondary bg-secondary/10 absolute cursor-move overflow-hidden border border-dashed p-1 text-black"
		style={area}
		role="button"
		tabindex="-1"
		aria-label={label}
		title={label}
		onpointerdown={onmove}
	>
		{@render content()}
		{#if onresize}
			<span
				class="bg-secondary absolute right-0 bottom-0 h-3 w-3 cursor-nwse-resize"
				role="presentation"
				onpointerdown={onresize}
			></span>
		{/if}
	</div>
{:else}
	<!-- fixed: shown where it prints, not to be moved -->
	<div
		class="absolute overflow-hidden border border-black/40 bg-black/5 p-1 text-black"
		style={area}
		role="img"
		aria-label="{label}: {m.documentLayoutFixed()}"
		title="{label}: {m.documentLayoutFixed()}"
	>
		{@render content()}
	</div>
{/if}
