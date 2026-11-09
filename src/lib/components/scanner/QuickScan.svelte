<script lang="ts">
	import { BarcodeDetector } from 'barcode-detector';
	import { onDestroy, onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { m } from '#lib/paraglide/messages';
	import ScanViewfinder from './ScanViewfinder.svelte';
	import { acceptScan, type ScanAcceptance } from './scanAcceptance';
	import { readAimIdentifier } from './aimIdentifier';

	interface Props {
		/** Which codes it takes; a refused one is reported, and the camera waits for the next. */
		acceptance: ScanAcceptance;
		/** Called once for the first code the camera reads that is accepted. */
		onscan: (scan: { code: string; userId: string }) => void;
		/** Called when the camera is turned off or cannot start. */
		onclose: () => void;
	}

	let { acceptance, onscan, onclose }: Props = $props();

	let videoElem = $state<HTMLVideoElement>();
	let streaming = $state(false);
	let starting = $state(true);
	let handled = $state<string | null>(null);

	// Created on first use: the polyfill cannot be constructed during SSR
	let detector: BarcodeDetector | undefined;
	let detecting = false;
	/** The code refused last, passed over while it is still in the picture. */
	let refused: string | null = null;

	async function check(found: { rawValue: string; format: string }) {
		const read = readAimIdentifier(found.rawValue.trim());
		const verdict = await acceptScan({
			text: read.code,
			format: read.format ?? found.format,
			acceptance
		});
		if (!verdict.accepted) {
			refused = found.rawValue;
			toast.error(verdict.message);
			return;
		}
		// one scan per opening: the caller closes the camera or opens it again
		handled = found.rawValue;
		onscan({ code: verdict.code, userId: verdict.userId });
	}

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
			const found = (await detector.detect(videoElem)).find(
				(barcode) => barcode.rawValue && barcode.rawValue !== refused
			);
			if (found) await check(found);
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
