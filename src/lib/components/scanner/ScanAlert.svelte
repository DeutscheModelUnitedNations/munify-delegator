<script lang="ts">
	import { m } from '#lib/paraglide/messages';

	/**
	 * Over the camera's picture: a green flash for a page done with, and while something is wrong
	 * what it is, with the button that goes on. The camera waits until it is pressed.
	 */
	interface Props {
		flash?: 'success' | 'problem';
		problem?: string;
		onresume: () => void;
	}

	let { flash, problem, onresume }: Props = $props();

	/** The button takes the focus, so Enter or Space goes on, also from a hand scanner's keyboard. */
	const focusOnShow = (button: HTMLButtonElement) => button.focus();
</script>

{#if flash === 'success'}
	<div
		class="border-success bg-success/20 pointer-events-none absolute inset-0 rounded-box border-8"
		aria-hidden="true"
	></div>
{/if}

{#if problem}
	<div
		class="bg-error/80 text-error-content absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center"
		role="alert"
	>
		<i aria-hidden="true" class="ph-duotone ph-warning-octagon text-5xl"></i>
		<p class="max-w-md text-lg font-semibold">{problem}</p>
		<p class="max-w-md text-sm">{m.paperCameraProblemHint()}</p>
		<button type="button" class="btn btn-lg" onclick={onresume} {@attach focusOnShow}>
			<i aria-hidden="true" class="ph-duotone ph-play"></i>
			{m.paperCameraResume()}
		</button>
	</div>
{/if}
