<script lang="ts">
	import type { BoxPlacement } from '#lib/helpers/documentLayout';
	import type { PaperMark } from '#lib/paperScan/fields';
	import { m } from '#lib/paraglide/messages';
	import type { FieldCheck } from './layoutCheck';

	/**
	 * A field read off a scan, on the layout editor's page: a box to tick, drawn as the frame it
	 * prints with, or a field to write in (a signature, place and date), an outline only, since it
	 * prints nothing and goes over the template's own line. Its colour says what a scan of the empty
	 * form would make of it where it is (`checkFields`): free, unclear or already filled. A box is
	 * labelled beside it, a field to write in inside. Moved and resized from its corner.
	 */
	interface Props {
		label: string;
		placement: BoxPlacement;
		mark: PaperMark;
		check: FieldCheck;
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
		mark,
		check,
		scale,
		onmove,
		onresize,
		selected = false,
		onselect
	}: Props = $props();

	const tone = $derived(
		{
			free: 'border-success bg-success/10',
			unclear: 'border-warning bg-warning/20',
			filled: 'border-error bg-error/20',
			unknown: 'border-info bg-info/10'
		}[check]
	);
	const verdict = $derived(
		{
			free: m.documentLayoutCheckFree,
			unclear: m.documentLayoutCheckUnclear,
			filled: m.documentLayoutCheckFilled,
			unknown: m.documentLayoutCheckUnknown
		}[check]()
	);
	const named = $derived(`${label}: ${verdict}`);
</script>

<div
	class="absolute cursor-move text-black {tone} {mark === 'checkbox'
		? 'border'
		: 'border border-dashed'} {selected ? 'ring-primary ring-2' : ''}"
	style="left: {placement.x * 100}%; top: {placement.y * 100}%; width: {placement.width *
		100}%; height: {placement.height * 100}%;"
	role="button"
	tabindex="0"
	aria-label={named}
	aria-pressed={selected}
	title={named}
	onpointerdown={onmove}
	onfocus={onselect}
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
		class="bg-base-content/40 absolute right-0 bottom-0 h-2 w-2 cursor-nwse-resize"
		role="presentation"
		onpointerdown={onresize}
	></span>
</div>
