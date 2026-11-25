<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import PostalGuide from '#lib/components/postalGuide/PostalGuide.svelte';
	import { createGuideProgress } from '#lib/components/postalGuide/guideProgress.svelte.js';
	import { GUIDE_DURATIONS } from '#lib/components/postalGuide/steps';
	import { completePostalGuide, fetchPostalGuideStatus } from '#lib/state/postalGuide.svelte.js';

	/** The postal guide as a step of the page; whoever watched it to its end before may skip it. */
	let { onDone }: { onDone: () => void } = $props();

	const status = await fetchPostalGuideStatus();
	const progress = createGuideProgress({
		durations: GUIDE_DURATIONS,
		skippable: status.skippable
	});
</script>

<PostalGuide
	{progress}
	onComplete={() => completePostalGuide(status)}
	finish={{ label: m.next(), icon: 'arrow-down', onclick: onDone }}
	onSkip={status.skippable ? onDone : undefined}
/>
