<script lang="ts">
	import { BarcodeDetector } from 'barcode-detector';
	import { onDestroy, onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { m } from '$lib/paraglide/messages';
	import ScanViewfinder from './ScanViewfinder.svelte';

	interface Props {
		/** Called once for each code the camera reads, with the format it was read in. */
		onscan: (scan: { rawValue: string; format: string }) => void;
		/** Called when the camera is turned off or cannot start. */
		onclose: () => void;
	}

	let { onscan, onclose }: Props = $props();

	let videoElem = $state<HTMLVideoElement>();
	let streaming = $state(false);
	let starting = $state(true);
	let handled = $state<string | null>(null);

	// Created on first use: the polyfill cannot be constructed during SSR
	let detector: BarcodeDetector | undefined;
	let detecting = false;

	function stopVideo() {
		if (videoElem?.srcObject instanceof MediaStream) {
			videoElem.srcObject.getTracks().forEach((track) => track.stop());
			videoElem.srcObject = null;
		}
		streaming = false;
	}

	// fallow-ignore-next-line complexity
	async function startVideo() {
		if (!videoElem) return;
		try {
			if (!navigator.mediaDevices) throw new Error(m.cameraInsecureContext());
			videoElem.srcObject = await navigator.mediaDevices.getUserMedia({
				video: { facingMode: { ideal: 'environment' } }
			});
			await videoElem.play();
			streaming = true;
		} catch (error) {
			toast.error(error instanceof Error ? error.message : m.cameraFailed());
			onclose();
		} finally {
			starting = false;
		}
	}

	// fallow-ignore-next-line complexity
	async function detect() {
		if (detecting || handled || !videoElem || videoElem.readyState < 2) return;
		detecting = true;
		try {
			detector ??= new BarcodeDetector();
			const found = (await detector.detect(videoElem)).find((barcode) => barcode.rawValue);
			if (found) {
				// one scan per opening: the caller closes the camera or opens it again
				handled = found.rawValue;
				onscan({ rawValue: found.rawValue, format: found.format });
			}
		} catch (error) {
			toast.error(m.barcodeDetectError({ error: String(error) }));
		} finally {
			detecting = false;
		}
	}

	onMount(() => {
		void startVideo();
		const timer = setInterval(detect, 300);
		return () => clearInterval(timer);
	});
	onDestroy(stopVideo);
</script>

<ScanViewfinder
	bind:videoElem
	{streaming}
	{starting}
	scannedCode={handled}
	scanPromptText={m.quickScanPrompt()}
	canSwitchCamera={false}
	onswitch={() => {}}
	onstop={() => {
		stopVideo();
		onclose();
	}}
	onstart={() => void startVideo()}
/>
