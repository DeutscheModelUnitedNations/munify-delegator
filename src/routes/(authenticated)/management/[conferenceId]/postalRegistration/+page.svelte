<script lang="ts">
	import { cache, graphql } from '$houdini';
	import { PaymentReferenceByIdQueryStore } from '$houdini/plugins/houdini-svelte/stores/PaymentReferenceByIdQuery';
	import * as m from '$lib/paraglide/messages';
	import { languageTag } from '$lib/paraglide/runtime';
	import { DatePicker } from '@svelte-plugins/datepicker';
	import { type PageData } from './$houdini';
	import { fly, fade } from 'svelte/transition';
	import type { AdministrativeStatus } from '@prisma/client';
	import formatNames from '$lib/services/formatNames';
	import { BarcodeDetector } from 'barcode-detector';
	import hotkeys from 'hotkeys-js';

	import { onMount } from 'svelte';
	import { toast } from '@zerodevx/svelte-toast';
	let videoElem: HTMLVideoElement;
	let canvasElem: HTMLCanvasElement;
	let streaming = false;

	let queryUserId = $state('');

	const barcodeDetector: BarcodeDetector = new BarcodeDetector({
		// make sure the formats are supported
		formats: ['data_matrix']
	});

	async function startVideo() {
		queryUserId = '';
		if (!videoElem) {
			console.error('videoElem is not available.');
			return;
		}
		try {
			const stream = await navigator.mediaDevices.getUserMedia({ video: true });
			videoElem.srcObject = stream;
			await videoElem.play();
			streaming = true;
		} catch (error) {
			console.error('Error accessing camera:', error);
		}
	}

	async function stopVideo() {
		if (videoElem.srcObject) {
			const stream = videoElem.srcObject as MediaStream;
			const tracks = stream.getTracks();
			tracks.forEach((track) => track.stop());
			videoElem.srcObject = null;
		}
		streaming = false;
	}

	function scanForCode() {
		if (streaming) {
			canvasElem.width = videoElem.videoWidth;
			canvasElem.height = videoElem.videoHeight;
			const ctx = canvasElem.getContext('2d');
			if (ctx) {
				// Draw the current video frame (needed for toBlob conversion)
				ctx.drawImage(videoElem, 0, 0, videoElem.videoWidth, videoElem.videoHeight);
				// Convert the drawn image into a blob then to an ArrayBuffer (buffer)
				canvasElem.toBlob(async (blob) => {
					if (blob) {
						barcodeDetector
							.detect(canvasElem)
							.then((barcodes) => {
								if (barcodes.length > 0) {
									const barcode = barcodes[0];
									const code = barcode.rawValue;
									if (code) {
										stopVideo();
										queryUserId = code;
									} else {
										throw new Error('Barcode value is empty');
									}
								}
							})
							.catch((error) => {
								toast.push('Error detecting barcode: ' + error, {
									duration: 5000,
									dismissable: true
								});
							});
					}
				}, 'image/jpeg');
			}
		}
	}

	$effect(() => {
		if (!queryUserId) {
			startVideo();
			// Automatically scan every 500ms
			setInterval(scanForCode, 500);
		}
	});
</script>

<div class="flex w-full flex-col gap-8 p-10">
	<div class="flex flex-col gap-2">
		<h2 class="text-2xl font-bold">{m.postalRegistration()}</h2>
		<!-- <p>{@html m.paymentAdminDescription()}</p> -->
	</div>

	<!-- Always render the media container; hide it if queryUserId exists -->
	<div
		class="media-container {queryUserId
			? 'hidden'
			: ''} max-w-1/3 relative z-50 flex aspect-video items-center justify-center overflow-hidden rounded-lg bg-primary shadow-lg lg:fixed lg:right-4 lg:top-4 lg:w-60"
	>
		<i
			class="fas fa-camera absolute left-1/2 top-1/2 -z-10 -translate-x-1/2 -translate-y-1/2 text-3xl text-white"
		></i>
		<video bind:this={videoElem} autoplay playsinline>
			<track kind="captions" src="" srclang="en" label="English" default />
		</video>
		<canvas bind:this={canvasElem} class="hidden"></canvas>
	</div>

	<div class="flex flex-col gap-2">
		<div class="flex w-full max-w-md items-center justify-center gap-4 rounded-lg bg-base-200 p-4">
			<i class="fa-duotone fa-barcode {!queryUserId && 'fa-beat'}"></i>
			{#if queryUserId}
				<div class="truncate font-mono text-sm">
					{queryUserId}
				</div>
			{/if}
		</div>
	</div>
</div>
