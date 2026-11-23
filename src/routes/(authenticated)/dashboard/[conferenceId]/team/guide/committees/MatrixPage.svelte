<script lang="ts">
	import type { ResolvedPathname } from '$app/types';
	import { m } from '#lib/paraglide/messages';
	import type { GuidePageState } from '#lib/guide/library';
	import StateDot from '../tree/StateDot.svelte';

	/** A page in the committee matrix: its state, opening the editor. */
	let { href, title, state }: { href: ResolvedPathname; title: string; state: GuidePageState } =
		$props();

	const LABEL: Record<GuidePageState, () => string> = {
		DRAFT: () => m.guideStateDraft(),
		CHANGED: () => m.guideStateChanged(),
		PUBLISHED: () => m.guideStatePublished()
	};
</script>

<a class="link-hover flex items-center gap-2" {href} {title}>
	<StateDot {state} />
	<span aria-hidden="true">{LABEL[state]()}</span>
	<span class="sr-only">{title}</span>
</a>
