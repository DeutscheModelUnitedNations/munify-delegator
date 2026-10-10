<script lang="ts">
	import { BarcodeDetector, type BarcodeFormat } from 'barcode-detector';
	import { onDestroy, onMount, tick, untrack, type Snippet } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { readAimIdentifier } from './aimIdentifier';
	import { PersistedState } from '$lib/state/persistedState.svelte';
	import { m } from '$lib/paraglide/messages';
	import ScanSearchBar from './ScanSearchBar.svelte';
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
		/** The barcode format the camera read the code in; `null` for a typed or picked code. */
		scannedFormat?: string | null;
		/** Shown beside the camera, e.g. the person the code leads to */
		result?: Snippet;
		/** Shown under the camera, e.g. who was scanned before */
		belowCamera?: Snippet;
		/**
		 * Hides the search box and the camera, which keep running, while the result needs the
		 * person's attention. The search box gets the focus back when they return.
		 */
		collapsed?: boolean;
	}

	let {
		barcodeFormats = ['data_matrix', 'code_128'],
		persistKey,
		conferenceId,
		manualPlaceholder = '',
		scanPromptText = '',
		scannedCode = $bindable<string | null>(''),
		scannedFormat = $bindable<string | null>(null),
		result,
		belowCamera,
		collapsed = false
	}: Props = $props();

	// Internal state
	let availableVideoDevices: MediaDeviceInfo[] = $state([]);
	let facingMode = $state<'environment' | 'user'>('environment');
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

	/** Reads the cameras present. Browsers only list them (with ids) once camera access was granted. */
	async function refreshVideoDevices() {
		const devices = await navigator.mediaDevices.enumerateDevices();
		availableVideoDevices = devices.filter((device) => device.kind === 'videoinput');
	}

	/** Starts the stream in the video element, unless the browser offers no camera here. */
	async function openCamera(video: HTMLVideoElement) {
		// Browsers only expose `mediaDevices` on secure contexts (HTTPS or localhost)
		if (!navigator.mediaDevices) {
			toast.error(m.cameraInsecureContext());
			cameraWanted.current = false;
			return;
		}
		// `ideal` falls back to whatever camera exists, e.g. a laptop's single webcam
		const stream = await navigator.mediaDevices.getUserMedia({
			video: { facingMode: { ideal: facingMode } }
		});
		video.srcObject = stream;
		await video.play();
		streaming = true;
		cameraWanted.current = true;
		await refreshVideoDevices();
	}

	async function startVideo() {
		if (!videoElem || starting) return;
		starting = true;
		try {
			stopVideo();
			await openCamera(videoElem);
		} catch (error) {
			console.error('Error accessing camera:', error);
			toast.error(cameraErrorMessage(error));
			// Do not retry on every visit when the camera is denied or missing
			cameraWanted.current = false;
		} finally {
			starting = false;
		}
	}

	/** Flips between the outward facing and the selfie camera. */
	function switchCamera() {
		facingMode = facingMode === 'environment' ? 'user' : 'environment';
		startVideo();
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
		const codes = (await barcodeDetector.detect(video)).filter((barcode) => !!barcode.rawValue);
		if (!codes.some((barcode) => barcode.rawValue === blockedCode)) blockedCode = null;
		return codes.find((barcode) => barcode.rawValue !== blockedCode);
	}

	function acceptScanned(barcode: { rawValue: string; format: string } | undefined) {
		// The scan may have been answered by hand while the detector was running
		if (!barcode || scannedCode) return;
		scannedCode = barcode.rawValue;
		scannedFormat = barcode.format;
		blockedCode = barcode.rawValue;
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

	function submitCode(text: string) {
		// a keyboard scanner may put the kind of code it read in front of what it types
		const read = readAimIdentifier(text);
		scannedCode = read.code;
		scannedFormat = read.format;
		clearSearch();
		manualInputElem?.blur();
	}

	function submitManual() {
		const typed = query.trim();
		const code = readAimIdentifier(typed).format
			? typed
			: codeToSubmit(query, suggestions, highlighted);
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
		if (!text || looksLikeUserId(text) || readAimIdentifier(text).format) {
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

	// A hand scanner types into the search box, so it has to hold the focus again once it is shown
	let wasCollapsed = false;
	$effect(() => {
		const hidden = collapsed;
		if (wasCollapsed && !hidden) {
			void tick().then(() => manualInputElem?.focus());
		}
		wasCollapsed = hidden;
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

<div class="flex w-full min-w-0 flex-col gap-4 md:gap-6">
	<!-- Search by name, email or id; also where a hand scanner types -->
	<div class="relative w-full" class:hidden={collapsed}>
		<ScanSearchBar
			bind:value={query}
			bind:inputElem={manualInputElem}
			busy={searching}
			onsubmit={submitManual}
			role="combobox"
			aria-expanded={suggestions.length > 0}
			aria-controls="scanner-suggestions-{persistKey}"
			aria-autocomplete="list"
			onkeydown={onInputKeydown}
			placeholder={manualPlaceholder}
			aria-label={m.userIdInput()}
		/>

		<ScanSuggestions
			id="scanner-suggestions-{persistKey}"
			{suggestions}
			bind:highlighted
			onpick={submitCode}
		/>
	</div>

	<!-- Camera, with what the scan leads to beside it; on a phone the result comes before the history -->
	<div
		class="grid grid-cols-[minmax(0,1fr)] items-start gap-4 md:gap-6 {result && !collapsed
			? 'lg:grid-cols-2'
			: ''}"
	>
		<div class="min-w-0 lg:col-start-1" class:hidden={collapsed}>
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
		</div>
		{#if belowCamera}
			<div class="order-last min-w-0 lg:order-none lg:col-start-1" class:hidden={collapsed}>
				{@render belowCamera()}
			</div>
		{/if}
		{#if result}
			<div class="min-w-0 {collapsed ? '' : 'lg:col-start-2 lg:row-span-2 lg:row-start-1'}">
				{@render result()}
			</div>
		{/if}
	</div>
</div>
