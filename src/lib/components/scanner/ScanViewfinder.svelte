<script lang="ts">
	import type { Snippet } from 'svelte';
	import { m } from '#lib/paraglide/messages';
	import type { CameraZoom } from './camera';
	import ScanFrame from './ScanFrame.svelte';

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
		onswitch: () => void;
		onstop: () => void;
		onstart: () => void;
		/** Frames a whole A4 page, upright, instead of a square for the code alone. */
		page?: boolean;
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
		onswitch,
		onstop,
		onstart,
		page = false,
		overlay
	}: Props = $props();

	/** Width over height of the camera's picture, once it sends one; the box takes its shape. */
	let pictureAspect = $state<number>();
	function measure() {
		if (videoElem?.videoWidth && videoElem.videoHeight) {
			pictureAspect = videoElem.videoWidth / videoElem.videoHeight;
		}
	}
	const shaped = $derived(streaming && pictureAspect !== undefined);
	// As wide as there is room, no taller than half the screen, which keeps a portrait camera small
	const boxStyle = $derived(
		shaped ? `aspect-ratio: ${pictureAspect}; width: min(100%, 50dvh * ${pictureAspect});` : ''
	);
</script>

<div
	class="rounded-box relative mx-auto overflow-hidden {shaped
		? 'bg-black'
		: 'bg-base-200 h-32 w-full md:aspect-video md:h-auto md:max-h-[40vh] md:min-h-52'}"
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
		<ScanFrame {page} />

		<div class="absolute top-3 right-3 flex gap-2">
			{#if canSwitchCamera}
				<button
					class="btn btn-circle btn-sm border-none bg-black/50 text-white hover:bg-black/70"
					onclick={onswitch}
					aria-label={m.switchCamera()}
					title={m.switchCamera()}
				>
					<i aria-hidden="true" class="ph-duotone ph-camera-rotate"></i>
				</button>
			{/if}
			<button
				class="btn btn-circle btn-sm border-none bg-black/50 text-white hover:bg-black/70"
				onclick={onstop}
				aria-label={m.stopCamera()}
				title={m.stopCamera()}
			>
				<i aria-hidden="true" class="ph-duotone ph-video-camera-slash"></i>
			</button>
		</div>

		<div
			class="absolute bottom-4 left-1/2 flex max-w-[90%] -translate-x-1/2 items-center gap-2 rounded-full bg-black/60 px-4 py-1.5 text-sm text-white"
		>
			{#if scannedCode}
				<!-- Scanning pauses while a code is handled, whether it came from the camera or by hand -->
				<i aria-hidden="true" class="ph-duotone ph-pause-circle"></i>
				<span class="truncate font-mono">{scannedCode}</span>
			{:else}
				<i aria-hidden="true" class="ph-duotone ph-barcode icon-beat-fade"></i>
				<span class="truncate">{scanPromptText}</span>
			{/if}
		</div>
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
