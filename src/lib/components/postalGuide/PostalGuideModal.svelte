<!--
	@component
	The postal guide as a dialog, shown before documents are downloaded outside the postal
	registration page. Closed before its end there is no download, and it goes on where it was.
-->
<script module lang="ts">
	import { createGuideProgress, type GuideProgress } from './guideProgress.svelte.js';
	import { GUIDE_DURATIONS } from './steps';

	let unfinished: GuideProgress | undefined;

	function progressFor({ skippable }: { skippable: boolean }) {
		if (skippable) return createGuideProgress({ durations: GUIDE_DURATIONS, skippable });
		unfinished ??= createGuideProgress({ durations: GUIDE_DURATIONS });
		return unfinished;
	}
</script>

<script lang="ts">
	import Modal from '#lib/components/Modal.svelte';
	import { m } from '#lib/paraglide/messages';
	import { completePostalGuide, postalGuide } from '#lib/state/postalGuide.svelte.js';
	import PostalGuide from './PostalGuide.svelte';

	// Read once: the dialog is mounted for one request
	const request = postalGuide.current;
	const progress = progressFor({ skippable: request?.skippable ?? false });
	progress.restartStep();

	function complete() {
		unfinished = undefined;
		if (request) void completePostalGuide(request);
	}
</script>

<Modal
	open
	title={m.postalGuideTitle()}
	wide
	keepOpenOnBackdrop
	onclose={() => postalGuide.close(false)}
>
	<PostalGuide
		{progress}
		onComplete={complete}
		finish={{
			label: m.downloadDocuments(),
			icon: 'download-simple',
			onclick: () => postalGuide.close(true)
		}}
		onSkip={request?.skippable ? () => postalGuide.close(true) : undefined}
		onLeave={() => postalGuide.close(false)}
	/>
</Modal>
