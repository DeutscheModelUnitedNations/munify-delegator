<script lang="ts">
	import type { Snippet } from 'svelte';
	import { m } from '#lib/paraglide/messages';
	import { tappedPoint, type CameraZoom } from './camera';
	import ScanCameraButtons from './ScanCameraButtons.svelte';
	import ScanFrame from './ScanFrame.svelte';
	import type { PageAim } from './pageCamera.svelte';
	import { pageInPlace } from './pageCameraHints';
	import ScanStatus from './ScanStatus.svelte';
	import PageAimOverlay from './PageAimOverlay.svelte';

	interface Props {
		/** The element the camera stream is attached to */
		videoElem?: HTMLVideoElement;
		streaming: boolean;
		starting: boolean;
		/** The code being handled; scanning pauses while there is one */
		scannedCode: string | null;
		scanPromptText: string;
		canSwitchCamera: boolean;
		/** The camera's zoom, when it has one: a slider to zoom in on a code printed small. */
		zoom?: CameraZoom;
		onzoom?: (value: number) => void;
		/** Whether the camera's light is on, when it has one to switch. */
		torch?: boolean;
		ontorch?: (on: boolean) => void;
		onswitch: () => void;
		onstop: () => void;
		onstart: () => void;
		/** Frames a whole A4 page, upright, instead of a square for the code alone. */
		page?: boolean;
		/**
		 * While pages are read: what to tell the person, the page's marks in the picture, how it
		 * flashes, and what is wrong, with the way to go on.
		 */
		aim?: PageAim;
		/** Focuses on a point of the picture (shares of its width and height), tapped on. */
		onfocus?: (x: number, y: number) => void;
		/** Laid over the top left corner, under the zoom, whether the camera runs or not. */
		overlay?: Snippet;
	}

	let {
		videoElem = $bindable(),
		streaming,
		starting,
		scannedCode,
		scanPromptText,
		canSwitchCamera,
		zoom,
		onzoom,
		torch,
		ontorch,
		onswitch,
		onstop,
		onstart,
		page = false,
		aim,
		onfocus,
		overlay
	}: Props = $props();

	/** Focuses where the picture was tapped; from the keyboard, on its middle. */
	function focusTapped(event: MouseEvent & { currentTarget: HTMLButtonElement }) {
		const { x, y } = tappedPoint({
			box: event.currentTarget.getBoundingClientRect(),
			at: { x: event.clientX, y: event.clientY },
			byPointer: event.detail > 0
		});
		onfocus?.(x, y);
	}

	/** Width over height of the camera's picture, once it sends one; the box takes its shape. */
	let pictureAspect = $state<number>();
	function measure() {
		if (videoElem?.videoWidth && videoElem.videoHeight) {
			pictureAspect = videoElem.videoWidth / videoElem.videoHeight;
		}
	}
	const shaped = $derived(streaming && pictureAspect !== undefined);
	// As wide as there is room, no taller than `--scan-height`: on a phone, held over the paper, most
	// of the screen; beside the result on a computer half of it, which keeps a portrait camera small
	const boxStyle = $derived(
		shaped
			? `aspect-ratio: ${pictureAspect}; width: min(100%, var(--scan-height) * ${pictureAspect});`
			: ''
	);
</script>

<div
	class="rounded-box relative mx-auto overflow-hidden [--scan-height:78dvh] md:[--scan-height:50dvh] {shaped
		? 'bg-black'
		: 'bg-base-200 h-44 w-full md:aspect-video md:h-auto md:max-h-[40vh] md:min-h-52'}"
	style={boxStyle}
>
	<video
		bind:this={videoElem}
		class="absolute inset-0 h-full w-full object-cover {streaming ? '' : 'invisible'}"
		autoplay
		muted
		playsinline
		onloadedmetadata={measure}
		onresize={measure}
	>
		<track kind="captions" src="" srclang="en" label="English" default />
	</video>

	{#if streaming}
		{#if onfocus}
			<button
				type="button"
				class="absolute inset-0 cursor-crosshair"
				aria-label={m.cameraTapToFocus()}
				onclick={focusTapped}
			></button>
		{/if}
		<ScanFrame {page} ready={aim ? pageInPlace(aim.hint) : false} />

		<ScanCameraButtons {canSwitchCamera} {torch} {ontorch} {onswitch} {onstop} />

		<ScanStatus hint={aim?.hint} {scannedCode} {scanPromptText} />

		{#if aim}
			<PageAimOverlay {aim} />
		{/if}
	{:else}
		<div
			class="absolute inset-0 flex flex-col items-center justify-center gap-2 p-3 text-center md:gap-4 md:p-4"
		>
			<i
				aria-hidden="true"
				class="ph-duotone ph-video-camera-slash hidden text-base-content/40 md:block md:text-4xl"
			></i>
			<!-- On a phone the box is too low for the hint; the code field above says as much -->
			<p class="text-base-content/70 hidden text-sm md:block">{m.cameraOff()}</p>
			<button class="btn btn-primary btn-sm md:btn-md" onclick={onstart} disabled={starting}>
				{#if starting}
					<span class="loading loading-spinner loading-sm"></span>
				{:else}
					<i aria-hidden="true" class="ph-duotone ph-video"></i>
				{/if}
				{m.startCamera()}
			</button>
		</div>
	{/if}

	<div class="absolute top-3 left-3 flex flex-col items-start gap-2">
		{#if streaming && zoom && onzoom}
			<label class="flex items-center gap-2 rounded-full bg-black/50 px-3 py-1.5 text-white">
				<i aria-hidden="true" class="ph-duotone ph-magnifying-glass-plus"></i>
				<input
					type="range"
					class="range range-xs w-24 sm:w-32"
					min={zoom.min}
					max={zoom.max}
					step={zoom.step}
					value={zoom.value}
					aria-label={m.cameraZoom()}
					oninput={(event) => onzoom(event.currentTarget.valueAsNumber)}
				/>
			</label>
		{/if}
		{@render overlay?.()}
	</div>
</div>
