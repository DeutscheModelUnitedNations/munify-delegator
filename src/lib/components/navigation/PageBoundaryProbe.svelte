<script lang="ts">
	import PageBoundary from './PageBoundary.svelte';
	import PageBoundaryProbePage from './PageBoundaryProbePage.svelte';
	import { TEAM_SKELETONS } from '#lib/data/teamSkeletons';

	/** A page for `PageBoundary.dom.svelte.test.ts`: its content waits for whatever promise it is handed. */
	let { key, load }: { key: string; load: () => Promise<string> } = $props();
</script>

<PageBoundary {key} skeleton={TEAM_SKELETONS.participants}>
	<PageBoundaryProbePage {load} />
</PageBoundary>
