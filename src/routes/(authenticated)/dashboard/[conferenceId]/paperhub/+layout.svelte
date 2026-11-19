<script lang="ts">
	import { page } from '$app/state';
	import BackToDashboard from '#lib/components/BackToDashboard.svelte';
	import PageBoundary from '#lib/components/navigation/PageBoundary.svelte';
	import { teamRelativePath, teamSkeletonForPath } from '#lib/data/teamRoutes';
	import type { LayoutProps } from './$types';

	let { children, params }: LayoutProps = $props();

	// A fresh `params` arrives with every navigation; the string keeps the paths from changing.
	const conferenceId = $derived(params.conferenceId);

	// The conference's shell keeps this frame across the hub's pages, so the skeleton between them
	// is shown here, below the way back.
	const pathname = $derived(page.url.pathname);
	const skeleton = $derived(teamSkeletonForPath(teamRelativePath({ pathname, conferenceId })));
</script>

<!-- Participants get no menu, so the hub brings its own way back (left out beside the menu) -->
<div class="pt-4 empty:hidden"><BackToDashboard {conferenceId} /></div>
<PageBoundary key={pathname} {skeleton}>
	{@render children()}
</PageBoundary>
