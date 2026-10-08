<script lang="ts">
	import { m } from '$lib/paraglide/messages';

	interface Props {
		/** The element the camera stream is attached to */
		videoElem?: HTMLVideoElement;
		streaming: boolean;
		starting: boolean;
		/** The code being handled; scanning pauses while there is one */
		scannedCode: string | null;
		scanPromptText: string;
		canSwitchCamera: boolean;
		onswitch: () => void;
		onstop: () => void;
		onstart: () => void;
	}

	let {
		videoElem = $bindable(),
		streaming,
		starting,
		scannedCode,
		scanPromptText,
		canSwitchCamera,
		onswitch,
		onstop,
		onstart
	}: Props = $props();
</script>

<div
	class="relative aspect-video max-h-[40vh] min-h-52 w-full overflow-hidden rounded-box border {streaming
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
			<div class="relative aspect-square h-3/5 rounded-2xl shadow-[0_0_0_100vmax_rgb(0_0_0/0.45)]">
				<span class="absolute top-0 left-0 size-8 rounded-tl-2xl border-t-4 border-l-4 border-white"
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
			{#if canSwitchCamera}
				<button
					class="btn btn-circle btn-sm border-none bg-black/50 text-white hover:bg-black/70"
					onclick={onswitch}
					aria-label={m.switchCamera()}
					title={m.switchCamera()}
				>
					<i class="fa-sharp-duotone fa-solid fa-camera-rotate"></i>
				</button>
			{/if}
			<button
				class="btn btn-circle btn-sm border-none bg-black/50 text-white hover:bg-black/70"
				onclick={onstop}
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
			<button class="btn btn-primary" onclick={onstart} disabled={starting}>
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
