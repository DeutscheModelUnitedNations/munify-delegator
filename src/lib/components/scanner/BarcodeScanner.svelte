<script lang="ts">
	import { BarcodeDetector, type BarcodeFormat } from 'barcode-detector';
	import { onDestroy, onMount, untrack, type Snippet } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { PersistedState } from '$lib/state/persistedState.svelte';
	import { m } from '$lib/paraglide/messages';
	import ScanSuggestions from './ScanSuggestions.svelte';
	import ScanViewfinder from './ScanViewfinder.svelte';
	import {
		codeToSubmit,
		looksLikeUserId,
		navigateSuggestions,
		type UserSuggestion
	} from './suggestions';
	import { searchUsers } from './userSearch';

	interface Props {
		/** Barcode formats to detect */
		barcodeFormats?: BarcodeFormat[];
		/** Key the scanner remembers whether the camera was on under, to turn it back on next time */
		persistKey: string;
		/** Conference whose people the search box suggests first */
		conferenceId: string;
		/** Placeholder for manual input field */
		manualPlaceholder?: string;
		/** Prompt shown while camera is scanning */
		scanPromptText?: string;
		/** The scanned/entered code — two-way bindable (nullable for queryParameters compatibility) */
		scannedCode: string | null;
		/** Shown beside the camera, e.g. the person the code leads to */
		result?: Snippet;
		/** Shown under the camera, e.g. who was scanned before */
		belowCamera?: Snippet;
	}

	let {
		barcodeFormats = ['data_matrix', 'code_128'],
		persistKey,
		conferenceId,
		manualPlaceholder = '',
		scanPromptText = '',
		scannedCode = $bindable<string | null>(''),
		result,
		belowCamera
	}: Props = $props();

	// Internal state
	let availableVideoDevices: MediaDeviceInfo[] = $state([]);
	let selectedVideoDeviceIndex = $state(0);
	let videoElem = $state<HTMLVideoElement>();
	let streaming = $state(false);
	let starting = $state(false);
	// The storage key and the formats are configuration fixed for the scanner's lifetime.
	let cameraWanted = new PersistedState(
		untrack(() => persistKey),
		false
	);
	let manualInputElem = $state<HTMLInputElement>();
	let query = $state('');
	let suggestions = $state<UserSuggestion[]>([]);
	let highlighted = $state(-1);
	let searching = $state(false);
	let searchSequence = 0;
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

	/** The video element once it shows a picture and no detection is running (only called while streaming). */
	function videoToDetect() {
		if (detecting || !videoElem) return undefined;
		return videoElem.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA ? videoElem : undefined;
	}

	/** The code in the picture that is not the one scanned last, if there is one. */
	async function detectNewCode(video: HTMLVideoElement) {
		barcodeDetector ??= new BarcodeDetector({ formats: barcodeFormats });
		const codes = (await barcodeDetector.detect(video))
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
		const video = videoToDetect();
		if (!video) return;
		detecting = true;
		try {
			acceptScanned(await detectNewCode(video));
		} catch (error) {
			toast.error(m.barcodeDetectError({ error: String(error) }));
		} finally {
			detecting = false;
		}
	}

	function clearSearch() {
		query = '';
		suggestions = [];
		highlighted = -1;
		searchSequence += 1;
		searching = false;
	}

	function submitCode(code: string) {
		scannedCode = code;
		clearSearch();
		manualInputElem?.blur();
	}

	function submitManual() {
		const code = codeToSubmit(query, suggestions, highlighted);
		if (code) submitCode(code);
	}

	function onInputKeydown(event: KeyboardEvent) {
		const move = navigateSuggestions(event.key, highlighted, suggestions.length);
		if (!move) return;
		event.preventDefault();
		highlighted = move.highlighted;
		if (move.close) {
			event.stopPropagation();
			suggestions = [];
		}
	}

	// --- Effects ---

	// Scan while streaming and no code is being handled
	$effect(() => {
		if (!streaming || scannedCode) return;
		const intervalId = setInterval(scanForCode, 300);
		return () => clearInterval(intervalId);
	});

	// Suggest people while typing, once the typing pauses; a scanned id needs no search
	$effect(() => {
		const text = query.trim();
		if (!text || looksLikeUserId(text)) {
			suggestions = [];
			highlighted = -1;
			searching = false;
			return;
		}
		const sequence = ++searchSequence;
		searching = true;
		const timeoutId = setTimeout(async () => {
			try {
				const found = await searchUsers(conferenceId, text);
				if (sequence !== searchSequence) return;
				suggestions = found;
				highlighted = -1;
			} catch (error) {
				console.error('User search failed:', error);
			} finally {
				if (sequence === searchSequence) searching = false;
			}
		}, 80);
		return () => clearTimeout(timeoutId);
	});

	onMount(() => {
		if (cameraWanted.current) startVideo();
	});

	onDestroy(stopVideo);

	// --- Exposed API ---

	/** Clears the code and readies the scanner for the next one; the camera keeps running. */
	export function reset() {
		scannedCode = null;
		clearSearch();
		if (manualInputElem) {
			// A hand scanner types into the field, but on a phone focusing it would pop the keyboard
			if (!streaming) manualInputElem.focus();
		}
	}
</script>

<div class="flex w-full flex-col gap-6">
	<!-- Search by name, email or id; also where a hand scanner types -->
	<div class="relative w-full">
		<form
			class="join w-full"
			onsubmit={(e) => {
				e.preventDefault();
				submitManual();
			}}
		>
			<label class="input join-item w-full">
				<i class="fa-sharp-duotone fa-solid fa-magnifying-glass text-base-content/50"></i>
				<input
					type="text"
					role="combobox"
					aria-expanded={suggestions.length > 0}
					aria-controls="scanner-suggestions-{persistKey}"
					aria-autocomplete="list"
					bind:this={manualInputElem}
					bind:value={query}
					onkeydown={onInputKeydown}
					placeholder={manualPlaceholder}
					aria-label={m.userIdInput()}
					class="grow"
					autocomplete="off"
				/>
				{#if searching}
					<span class="loading loading-spinner loading-xs"></span>
				{/if}
			</label>
			<button type="submit" class="btn btn-primary join-item" aria-label={m.search()}>
				<i class="fa-sharp-duotone fa-solid fa-arrow-right"></i>
			</button>
		</form>

		<ScanSuggestions
			id="scanner-suggestions-{persistKey}"
			{suggestions}
			bind:highlighted
			onpick={submitCode}
		/>
	</div>

	<!-- Camera, with what the scan leads to beside it -->
	<div class="grid items-start gap-6 {result ? 'lg:grid-cols-2' : ''}">
		<div class="flex flex-col gap-4">
			<ScanViewfinder
				bind:videoElem
				{streaming}
				{starting}
				{scannedCode}
				{scanPromptText}
				canSwitchCamera={availableVideoDevices.length > 1}
				onswitch={switchCamera}
				onstop={turnCameraOff}
				onstart={startVideo}
			/>
			{@render belowCamera?.()}
		</div>
		{@render result?.()}
	</div>
</div>
