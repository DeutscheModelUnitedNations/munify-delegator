<script lang="ts">
	import type { TextPlacement } from '#lib/helpers/documentLayout';

	/** A text on the layout editor's page: its first baseline at the point, left aligned or centred. */
	interface Props {
		label: string;
		placement: TextPlacement;
		align: 'left' | 'center';
		lines: string[];
		/** Pixels per point. */
		scale: number;
		onmove: (event: PointerEvent) => void;
		/** Picked in the editor: arrow keys move it. */
		selected?: boolean;
		/** Picks it (it got the focus). */
		onselect?: () => void;
	}

	let {
		label,
		placement,
		align,
		lines,
		scale,
		onmove,
		selected = false,
		onselect
	}: Props = $props();
	const size = $derived(placement.size * scale);
</script>

<div
	class="border-primary bg-primary/10 absolute cursor-move border border-dashed px-0.5 whitespace-nowrap text-black {align ===
	'center'
		? '-translate-x-1/2 text-center'
		: ''} {selected ? 'ring-primary ring-2' : ''}"
	style="left: {placement.x * 100}%; top: {placement.y *
		100}%; font-size: {size}px; line-height: 1.36; margin-top: -{size}px;"
	role="button"
	tabindex="0"
	aria-label={label}
	aria-pressed={selected}
	title={label}
	onpointerdown={onmove}
	onfocus={onselect}
>
	{#each lines as line, index (index)}
		<div>{line}</div>
	{/each}
</div>
