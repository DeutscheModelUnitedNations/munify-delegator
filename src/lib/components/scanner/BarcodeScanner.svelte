<script lang="ts">
	import { BarcodeDetector, type BarcodeFormat } from 'barcode-detector';
	import { onDestroy, onMount, untrack } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { PersistedState } from '$lib/state/persistedState.svelte';
	import { m } from '$lib/paraglide/messages';

	interface Props {
		/** Barcode formats to detect */
		barcodeFormats?: BarcodeFormat[];
		/** Key the scanner remembers whether the camera was on under, to turn it back on next time */
		persistKey: string;
		/** Placeholder for manual input field */
		manualPlaceholder?: string;
		/** Prompt shown while camera is scanning */
		scanPromptText?: string;
		/** The scanned/entered code — two-way bindable (nullable for queryParameters compatibility) */
		scannedCode: string | null;
	}

	let {
		barcodeFormats = ['data_matrix', 'code_128'],
		persistKey,
		manualPlaceholder = '',
		scanPromptText = '',
		scannedCode = $bindable<string | null>('')
	}: Props = $props();

	// Internal state
	let availableVideoDevices: MediaDeviceInfo[] = $state([]);
	let selectedVideoDeviceIndex = $state(0);
	let videoElem: HTMLVideoElement;
	let streaming = $state(false);
	let starting = $state(false);
	// The storage key and the formats are configuration fixed for the scanner's lifetime.
	let cameraWanted = new PersistedState(
		untrack(() => persistKey),
		false
	);
	let manualInputElem = $state<HTMLInputElement>();
	/**
	 * The code scanned last, ignored until it has left the picture: the stream keeps running between
	 * scans, so the paper still held up after a reset would otherwise be scanned again at once.
	 */
	let blockedCode: string | null = null;
	let detecting = false;

	// Created on first use: the polyfill cannot be constructed during SSR
	let barcodeDetector: BarcodeDetector | undefined;

	// --- Camera / Scanner functions ---

	/** The camera error messages, by the `DOMException` names browsers use for each failure. */
	const cameraErrorMessages: Record<string, () => string> = {
		NotAllowedError: m.cameraAccessDenied,
		PermissionDeniedError: m.cameraAccessDenied,
		NotFoundError: m.noCameraFound,
		NotReadableError: m.cameraInUse,
		TrackStartError: m.cameraInUse,
		OverconstrainedError: m.cameraConstraintsError,
		AbortError: m.cameraAborted
	};

	function cameraErrorMessage(error: unknown): string {
		if (error instanceof DOMException) {
			return (cameraErrorMessages[error.name] ?? m.cameraFailed)();
		}
		if (error instanceof Error) return m.cameraGenericError({ error: error.message });
		return m.cameraFailed();
	}

	/** Constraints that pick the selected camera, falling back to the first one available. */
	async function selectedCameraConstraints(): Promise<MediaTrackConstraints> {
		const devices = await navigator.mediaDevices.enumerateDevices();
		availableVideoDevices = devices.filter((device) => device.kind === 'videoinput');
		if (selectedVideoDeviceIndex >= availableVideoDevices.length) {
			selectedVideoDeviceIndex = 0;
		}
		if (availableVideoDevices.length === 0) return {};
		return { deviceId: { ideal: availableVideoDevices[selectedVideoDeviceIndex].deviceId } };
	}

	async function startVideo() {
		if (!videoElem || starting) return;
		starting = true;
		try {
			stopVideo();
			const videoConstraints = await selectedCameraConstraints();
			const stream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints });
			videoElem.srcObject = stream;
			await videoElem.play();
			streaming = true;
			cameraWanted.current = true;
		} catch (error) {
			console.error('Error accessing camera:', error);
			toast.error(cameraErrorMessage(error));
			// Do not retry on every visit when the camera is denied or missing
			cameraWanted.current = false;
		} finally {
			starting = false;
		}
	}

	function switchCamera() {
		if (availableVideoDevices.length > 1) {
			selectedVideoDeviceIndex = (selectedVideoDeviceIndex + 1) % availableVideoDevices.length;
			startVideo();
		}
	}

	function stopVideo() {
		// `MediaStream` does not exist during SSR, where this runs as the component is torn down.
		if (videoElem && videoElem.srcObject instanceof MediaStream) {
			videoElem.srcObject.getTracks().forEach((track) => track.stop());
			videoElem.srcObject = null;
		}
		streaming = false;
	}

	function turnCameraOff() {
		stopVideo();
		cameraWanted.current = false;
	}

	function readyToDetect() {
		return streaming && !detecting && videoElem.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA;
	}

	/** The code in the picture that is not the one scanned last, if there is one. */
	async function detectNewCode() {
		barcodeDetector ??= new BarcodeDetector({ formats: barcodeFormats });
		const codes = (await barcodeDetector.detect(videoElem))
			.map((barcode) => barcode.rawValue)
			.filter((code) => !!code);
		if (!codes.includes(blockedCode ?? '')) blockedCode = null;
		return codes.find((code) => code !== blockedCode);
	}

	function acceptScanned(code: string | undefined) {
		// The scan may have been answered by hand while the detector was running
		if (!code || scannedCode) return;
		scannedCode = code;
		blockedCode = code;
	}

	async function scanForCode() {
		if (!readyToDetect()) return;
		detecting = true;
		try {
			acceptScanned(await detectNewCode());
		} catch (error) {
			toast.error(m.barcodeDetectError({ error: String(error) }));
		} finally {
			detecting = false;
		}
	}

	function submitManual() {
		const code = manualInputElem?.value?.trim();
		if (!code) return;
		scannedCode = code;
		manualInputElem?.blur();
	}

	// --- Effects ---

	// Scan while streaming and no code is being handled
	$effect(() => {
		if (!streaming || scannedCode) return;
		const intervalId = setInterval(scanForCode, 300);
		return () => clearInterval(intervalId);
	});

	onMount(() => {
		if (manualInputElem) manualInputElem.value = scannedCode ?? '';
		if (cameraWanted.current) startVideo();
	});

	onDestroy(stopVideo);

	// --- Exposed API ---

	/** Clears the code and readies the scanner for the next one; the camera keeps running. */
	export function reset() {
		scannedCode = null;
		if (manualInputElem) {
			manualInputElem.value = '';
			// A hand scanner types into the field, but on a phone focusing it would pop the keyboard
			if (!streaming) manualInputElem.focus();
		}
	}
</script>

<div class="flex w-full flex-col gap-3">
	<!-- Camera viewport -->
	<div
		class="relative aspect-[4/3] w-full overflow-hidden rounded-box border sm:aspect-video {streaming
			? 'border-transparent bg-black'
			: 'bg-base-200 border-base-300 border-dashed'}"
	>
		<video
			bind:this={videoElem}
			class="absolute inset-0 h-full w-full object-cover {streaming ? '' : 'invisible'}"
			autoplay
			muted
			playsinline
		>
			<track kind="captions" src="" srclang="en" label="English" default />
		</video>

		{#if streaming}
			<!-- Crosshair: a square to hold the code in, the rest of the picture dimmed -->
			<div class="pointer-events-none absolute inset-0 flex items-center justify-center">
				<div
					class="relative aspect-square h-1/2 rounded-2xl sm:h-3/5 shadow-[0_0_0_100vmax_rgb(0_0_0/0.45)]"
				>
					<span
						class="absolute top-0 left-0 size-8 rounded-tl-2xl border-t-4 border-l-4 border-white"
					></span>
					<span
						class="absolute top-0 right-0 size-8 rounded-tr-2xl border-t-4 border-r-4 border-white"
					></span>
					<span
						class="absolute bottom-0 left-0 size-8 rounded-bl-2xl border-b-4 border-l-4 border-white"
					></span>
					<span
						class="absolute right-0 bottom-0 size-8 rounded-br-2xl border-r-4 border-b-4 border-white"
					></span>
					<span
						class="absolute top-1/2 left-1/2 h-px w-6 -translate-x-1/2 -translate-y-1/2 bg-white/80"
					></span>
					<span
						class="absolute top-1/2 left-1/2 h-6 w-px -translate-x-1/2 -translate-y-1/2 bg-white/80"
					></span>
				</div>
			</div>

			<div class="absolute top-3 right-3 flex gap-2">
				{#if availableVideoDevices.length > 1}
					<button
						class="btn btn-circle btn-sm border-none bg-black/50 text-white hover:bg-black/70"
						onclick={switchCamera}
						aria-label={m.switchCamera()}
						title={m.switchCamera()}
					>
						<i class="fa-sharp-duotone fa-solid fa-camera-rotate"></i>
					</button>
				{/if}
				<button
					class="btn btn-circle btn-sm border-none bg-black/50 text-white hover:bg-black/70"
					onclick={turnCameraOff}
					aria-label={m.stopCamera()}
					title={m.stopCamera()}
				>
					<i class="fa-sharp-duotone fa-solid fa-video-slash"></i>
				</button>
			</div>

			<div
				class="absolute bottom-4 left-1/2 flex max-w-[90%] -translate-x-1/2 items-center gap-2 rounded-full bg-black/60 px-4 py-1.5 text-sm text-white"
			>
				{#if scannedCode}
					<!-- Scanning pauses while a code is handled, whether it came from the camera or by hand -->
					<i class="fa-sharp-duotone fa-solid fa-circle-pause"></i>
					<span class="truncate font-mono">{scannedCode}</span>
				{:else}
					<i class="fa-sharp-duotone fa-solid fa-barcode-read fa-beat-fade"></i>
					<span class="truncate">{scanPromptText}</span>
				{/if}
			</div>
		{:else}
			<div class="absolute inset-0 flex flex-col items-center justify-center gap-4 p-4 text-center">
				<i class="fa-sharp-duotone fa-solid fa-video-slash text-base-content/40 text-4xl"></i>
				<p class="text-base-content/70 text-sm">{m.cameraOff()}</p>
				<button class="btn btn-primary" onclick={startVideo} disabled={starting}>
					{#if starting}
						<span class="loading loading-spinner loading-sm"></span>
					{:else}
						<i class="fa-sharp-duotone fa-solid fa-video"></i>
					{/if}
					{m.startCamera()}
				</button>
			</div>
		{/if}
	</div>

	<!-- Manual entry, also where a hand scanner types -->
	<form
		class="join w-full"
		onsubmit={(e) => {
			e.preventDefault();
			submitManual();
		}}
	>
		<label class="input join-item w-full">
			<i class="fa-sharp-duotone fa-solid fa-keyboard text-base-content/50"></i>
			<input
				type="text"
				bind:this={manualInputElem}
				placeholder={manualPlaceholder}
				aria-label={m.userIdInput()}
				class="grow font-mono"
				autocomplete="off"
			/>
		</label>
		<button type="submit" class="btn btn-primary join-item" aria-label={m.search()}>
			<i class="fa-sharp-duotone fa-solid fa-magnifying-glass"></i>
		</button>
	</form>
</div>
