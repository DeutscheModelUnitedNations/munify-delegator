<script lang="ts">
	import AimHintText from './AimHintText.svelte';
	import type { PageCameraHint } from './pageCamera.svelte';

	/** The line under the camera's picture: what it asks for, or the code being handled. */
	interface Props {
		/** While pages are read, what to tell the person. */
		hint?: PageCameraHint;
		scannedCode: string | null;
		scanPromptText: string;
	}

	let { hint, scannedCode, scanPromptText }: Props = $props();
</script>

<div
	class="absolute bottom-4 left-1/2 flex max-w-[90%] -translate-x-1/2 items-center gap-2 rounded-full bg-black/60 px-4 py-1.5 text-sm text-white"
>
	{#if hint}
		<AimHintText {hint} />
	{:else if scannedCode}
		<!-- Scanning pauses while a code is handled, whether it came from the camera or by hand -->
		<i aria-hidden="true" class="ph-duotone ph-pause-circle"></i>
		<span class="truncate font-mono">{scannedCode}</span>
	{:else}
		<i aria-hidden="true" class="ph-duotone ph-barcode icon-beat-fade"></i>
		<span class="truncate">{scanPromptText}</span>
	{/if}
</div>
