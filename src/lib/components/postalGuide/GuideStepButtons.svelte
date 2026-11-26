<!-- The buttons at the right of a step: on to the next one, once it may be opened. -->
<script lang="ts">
	import { m } from '#lib/paraglide/messages';

	interface Props {
		ready: boolean;
		onNext: () => void;
		/** Only where the guide may be skipped. */
		onSkip?: () => void;
	}

	let { ready, onNext, onSkip }: Props = $props();
</script>

{#if onSkip}
	<button type="button" class="btn btn-ghost" onclick={onSkip}>{m.postalGuideSkip()}</button>
{/if}
<button type="button" class="btn btn-primary" disabled={!ready} onclick={onNext}>
	{#if ready}
		{m.next()}
		<i aria-hidden="true" class="ph-fill ph-arrow-right"></i>
	{:else}
		{m.postalGuideLocked()}
		<i aria-hidden="true" class="ph-duotone ph-hourglass-medium"></i>
	{/if}
</button>
