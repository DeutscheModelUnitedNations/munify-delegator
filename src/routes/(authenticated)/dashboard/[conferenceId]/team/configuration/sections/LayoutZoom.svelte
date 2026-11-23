<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import { LAYOUT_ZOOMS } from '#lib/helpers/layoutZoom';

	/** Zooms the layout editor's page in and out, by the levels of `LAYOUT_ZOOMS`. */
	interface Props {
		zoom: number;
		onzoom: (step: 1 | -1) => void;
	}

	let { zoom, onzoom }: Props = $props();
</script>

<div class="join" role="group" aria-label={m.documentLayoutZoom()}>
	<button
		type="button"
		class="btn btn-sm btn-ghost join-item"
		aria-label={m.documentLayoutZoomOut()}
		title={m.documentLayoutZoomOut()}
		disabled={zoom <= LAYOUT_ZOOMS[0]}
		onclick={() => onzoom(-1)}
	>
		<i aria-hidden="true" class="ph-duotone ph-magnifying-glass-minus"></i>
	</button>
	<span
		class="join-item flex w-14 items-center justify-center text-sm tabular-nums"
		aria-live="polite"
	>
		{Math.round(zoom * 100)} %
	</span>
	<button
		type="button"
		class="btn btn-sm btn-ghost join-item"
		aria-label={m.documentLayoutZoomIn()}
		title={m.documentLayoutZoomIn()}
		disabled={zoom >= (LAYOUT_ZOOMS.at(-1) ?? 1)}
		onclick={() => onzoom(1)}
	>
		<i aria-hidden="true" class="ph-duotone ph-magnifying-glass-plus"></i>
	</button>
</div>
