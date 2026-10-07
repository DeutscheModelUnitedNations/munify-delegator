<script lang="ts">
	import bwipjs from '@bwip-js/browser';
	import { onMount } from 'svelte';

	interface Props {
		data: string;
	}

	let { data }: Props = $props();

	let canvasElement: HTMLCanvasElement;

	onMount(() => {
		if (canvasElement && data) {
			bwipjs.toCanvas(canvasElement, {
				bcid: 'datamatrix',
				text: data,
				scale: 3,
				paddingheight: 1,
				paddingwidth: 1
			});
		}
	});
</script>

<div class="animate-registration-pulse rounded-box p-1">
	<div class="animate-registration-border rounded-box p-1">
		<div class="flex items-center justify-center rounded-box bg-white p-2">
			<canvas bind:this={canvasElement} class="max-w-full"></canvas>
		</div>
	</div>
</div>
