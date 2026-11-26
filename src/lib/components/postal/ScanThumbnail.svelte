<!--
	@component
	A small picture of a kept scan, drawn from its file as it is read.
-->
<script lang="ts">
	import { drawPicture, loadScanPicture, THUMBNAIL_SIDE } from './scanPreview';

	let { url }: { url: string } = $props();

	const picture = $derived(await loadScanPicture({ url, maxSide: THUMBNAIL_SIDE }));
</script>

<canvas class="block h-full w-full object-contain" aria-hidden="true" {@attach drawPicture(picture)}
></canvas>
