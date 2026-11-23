<script lang="ts">
	import { m } from '#lib/paraglide/messages';

	/** The running camera's buttons: its light, the other camera, off. */
	interface Props {
		canSwitchCamera: boolean;
		/** Whether the light is on; undefined for a camera without one. */
		torch?: boolean;
		ontorch?: (on: boolean) => void;
		onswitch: () => void;
		onstop: () => void;
	}

	let { canSwitchCamera, torch, ontorch, onswitch, onstop }: Props = $props();

	const torchLabel = $derived(torch ? m.cameraTorchOff() : m.cameraTorchOn());
</script>

<div class="absolute top-3 right-3 flex gap-2">
	{#if torch !== undefined && ontorch}
		<button
			class="btn btn-circle btn-sm border-none {torch
				? 'bg-white text-black hover:bg-white/80'
				: 'bg-black/50 text-white hover:bg-black/70'}"
			onclick={() => ontorch(!torch)}
			aria-pressed={torch}
			aria-label={torchLabel}
			title={torchLabel}
		>
			<i aria-hidden="true" class="{torch ? 'ph-fill' : 'ph-duotone'} ph-flashlight"></i>
		</button>
	{/if}
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
