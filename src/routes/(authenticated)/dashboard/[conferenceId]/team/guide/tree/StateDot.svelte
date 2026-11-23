<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import type { GuidePageState } from '#lib/guide/library';

	/** A page's state as a dot: published, changed since, or never published (with its name for screen readers). */
	let { state }: { state: GuidePageState } = $props();

	const LOOK: Record<GuidePageState, { dot: string; label: () => string }> = {
		PUBLISHED: { dot: 'bg-success', label: () => m.guideStatePublished() },
		CHANGED: { dot: 'bg-warning', label: () => m.guideStateChanged() },
		DRAFT: { dot: 'border-base-content/70 border-[1.5px]', label: () => m.guideStateDraft() }
	};
</script>

<span
	class="inline-block size-2 shrink-0 rounded-full {LOOK[state].dot}"
	title={LOOK[state].label()}
	aria-hidden="true"
></span>
<span class="sr-only">{LOOK[state].label()}</span>
