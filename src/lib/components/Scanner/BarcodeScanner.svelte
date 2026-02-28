<script lang="ts">
	import { BarcodeDetector, type BarcodeFormat } from 'barcode-detector';
	import { onDestroy, onMount, type Snippet } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { persisted } from 'svelte-persisted-store';
	import FormFieldset from '$lib/components/Form/FormFieldset.svelte';
	import { m } from '$lib/paraglide/messages';

	interface Props {
		/** Barcode formats to detect */
		barcodeFormats?: BarcodeFormat[];
		/** Key for persisted camera preference store */
		persistKey: string;
		/** Placeholder for manual input field */
		manualPlaceholder?: string;
		/** Prompt shown while camera is scanning */
		scanPromptText?: string;
		/** z-index class for camera preview container */
		cameraZIndex?: string;
		/** The scanned/entered code — two-way bindable (nullable for queryParameters compatibility) */
		scannedCode: string | null;
		/** Optional snippet for extra controls between camera settings and input */
		extraControls?: Snippet;
	}

	let {
		barcodeFormats = ['data_matrix', 'code_128'],
		persistKey,
		manualPlaceholder = '',
		scanPromptText = '',
		cameraZIndex = 'z-30',
		scannedCode = $bindable<string | null>(''),
		extraControls
	}: Props = $props();

	// Internal state
	let availableVideoDevices: MediaDeviceInfo[] = $state([]);
	let selectedVideoDeviceIndex = $state(0);
	let videoElem: HTMLVideoElement;
	let canvasElem: HTMLCanvasElement;
	let streaming = $state(false);
	let useCamera = persisted(persistKey, false);
	let manualInputElem = $state<HTMLInputElement>();

	const barcodeDetector: BarcodeDetector = new BarcodeDetector({
		formats: barcodeFormats
	});

	// --- Camera / Scanner functions ---

	async function startVideo() {
		scannedCode = null;
		if (!videoElem) {
			console.error('videoElem is not available.');
			return;
		}
		try {
			if (streaming) {
				stopVideo();
			}
			const devices = await navigator.mediaDevices.enumerateDevices();
			availableVideoDevices = devices.filter((device) => device.kind === 'videoinput');
			if (selectedVideoDeviceIndex >= availableVideoDevices.length) {
				selectedVideoDeviceIndex = 0;
			}
			const videoConstraints: MediaTrackConstraints = {};
			if (availableVideoDevices.length > 0) {
				videoConstraints.deviceId = {
					ideal: availableVideoDevices[selectedVideoDeviceIndex].deviceId
				};
			}
			const stream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints });
			videoElem.srcObject = stream;
			await videoElem.play();
			streaming = true;
		} catch (error) {
			console.error('Error accessing camera:', error);
			let errorMessage = m.cameraFailed();
			if (error instanceof DOMException) {
				if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
					errorMessage = m.cameraAccessDenied();
				} else if (error.name === 'NotFoundError') {
					errorMessage = m.noCameraFound();
				} else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
					errorMessage = m.cameraInUse();
				} else if (error.name === 'OverconstrainedError') {
					errorMessage = m.cameraConstraintsError();
				} else if (error.name === 'AbortError') {
					errorMessage = m.cameraAborted();
				}
			} else if (error instanceof Error) {
				errorMessage = m.cameraGenericError({ error: error.message });
			}
			toast.error(errorMessage);
		}
	}

	function switchCamera() {
		if (availableVideoDevices.length > 1) {
			selectedVideoDeviceIndex = (selectedVideoDeviceIndex + 1) % availableVideoDevices.length;
			startVideo();
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
				ctx.drawImage(videoElem, 0, 0, videoElem.videoWidth, videoElem.videoHeight);
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
										scannedCode = code;
									} else {
										throw new Error('Barcode value is empty');
									}
								}
							})
							.catch((error) => {
								toast.error(m.barcodeDetectError({ error: String(error) }));
							});
					}
				}, 'image/jpeg');
			}
		}
	}

	// --- Effects ---

	// Scan interval while streaming and no code detected
	$effect(() => {
		let intervalId: ReturnType<typeof setInterval> | undefined;
		if (streaming && !scannedCode) {
			intervalId = setInterval(scanForCode, 500);
		}
		return () => {
			if (intervalId) {
				clearInterval(intervalId);
			}
		};
	});

	// Stop video when camera toggled off
	$effect(() => {
		if (!$useCamera) {
			if (streaming) {
				stopVideo();
			}
		}
	});

	onMount(() => {
		if (scannedCode && manualInputElem) {
			manualInputElem.value = scannedCode ?? '';
		}
	});

	onDestroy(() => {
		if (streaming) {
			stopVideo();
		}
	});

	// --- Exposed API ---

	export function reset() {
		scannedCode = null;
		if ($useCamera) {
			startVideo();
		} else if (manualInputElem) {
			manualInputElem.value = '';
			manualInputElem.focus();
		}
	}
</script>

<FormFieldset title={m.cameraSettings()}>
	<label for="useCamera-{persistKey}" class="mr-2">
		<input
			type="checkbox"
			id="useCamera-{persistKey}"
			bind:checked={$useCamera}
			class="toggle toggle-primary mr-2"
		/>
		{m.useCameraForScanning()}</label
	>
	{#if $useCamera}
		<button class="btn btn-primary mt-4" disabled={streaming} onclick={startVideo}>
			<i class="fa-solid fa-video"></i>
			{m.startCamera()}
		</button>
		<button
			class="btn btn-secondary mt-2"
			disabled={availableVideoDevices.length <= 1}
			onclick={switchCamera}
		>
			<i class="fa-solid fa-camera-rotate"></i>
			{m.switchCamera()}
		</button>
	{/if}
</FormFieldset>

{#if extraControls}
	{@render extraControls()}
{/if}

{#if !$useCamera}
	<FormFieldset title={m.userIdInput()}>
		<div class="join">
			<input
				type="text"
				bind:this={manualInputElem}
				placeholder={manualPlaceholder}
				class="input w-full input-lg join-item"
				onkeydown={(e) => {
					if (e.key === 'Enter') {
						e.preventDefault();
						scannedCode = manualInputElem?.value?.trim() || null;
					}
				}}
			/>
			<button
				class="btn btn-primary btn-lg join-item"
				aria-label={m.search()}
				onclick={() => {
					scannedCode = manualInputElem?.value?.trim() || null;
					manualInputElem?.blur();
				}}
			>
				<i class="fa-solid fa-magnifying-glass"></i>
			</button>
		</div>
	</FormFieldset>
{/if}

<!-- Camera preview -->
<div
	class="media-container {!$useCamera || scannedCode
		? 'hidden'
		: ''} bg-primary relative {cameraZIndex} flex aspect-video max-w-1/3 items-center justify-center overflow-hidden rounded-lg shadow-lg lg:fixed lg:top-4 lg:right-4 lg:w-60"
>
	<i
		class="fa-duotone fa-camera absolute top-1/2 left-1/2 -z-10 -translate-x-1/2 -translate-y-1/2 text-3xl text-white"
	></i>
	<video bind:this={videoElem} autoplay playsinline>
		<track kind="captions" src="" srclang="en" label="English" default />
	</video>
	<canvas bind:this={canvasElem} class="hidden"></canvas>
</div>

{#if $useCamera}
	<div class="flex flex-col gap-2">
		<div
			class="bg-base-200 border-1 border-base-300 flex h-18 w-full max-w-md items-center gap-6 rounded-box p-6"
		>
			<i class="fa-duotone fa-barcode-read {!scannedCode && 'fa-beat-fade'} text-2xl"></i>
			<div class="truncate font-mono text-sm">
				{scannedCode || scanPromptText}
			</div>
		</div>
	</div>
{/if}
