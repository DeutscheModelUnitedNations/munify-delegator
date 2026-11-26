<script lang="ts">
	import { untrack } from 'svelte';
	import { m } from '#lib/paraglide/messages';
	import PostalGuide from '#lib/components/postalGuide/PostalGuide.svelte';
	import { createGuideProgress } from '#lib/components/postalGuide/guideProgress.svelte.js';
	import PaymentGuideFinale from './PaymentGuideFinale.svelte';
	import { PAYMENT_GUIDE_DURATIONS, PAYMENT_GUIDE_STEPS } from './paymentGuideSteps';

	/**
	 * The payment guide as a step of the page: how to transfer the fee so it can be matched. Whoever
	 * watched it to its end before may skip it, like the postal guide.
	 */
	interface Props {
		skippable: boolean;
		/** It was watched to its end. */
		onComplete: () => void;
		onDone: () => void;
	}

	let { skippable, onComplete, onDone }: Props = $props();

	const progress = createGuideProgress({
		durations: PAYMENT_GUIDE_DURATIONS,
		// Read once: watching it to its end does not change how this run goes
		skippable: untrack(() => skippable)
	});
</script>

<PostalGuide
	{progress}
	steps={PAYMENT_GUIDE_STEPS}
	finale={PaymentGuideFinale}
	doneTitle={m.paymentGuideDoneTitle()}
	closingWarning={m.paymentGuideWarning()}
	{onComplete}
	finish={{ label: m.paymentGuideToTransfer(), icon: 'arrow-down', onclick: onDone }}
	onSkip={skippable ? onDone : undefined}
/>
