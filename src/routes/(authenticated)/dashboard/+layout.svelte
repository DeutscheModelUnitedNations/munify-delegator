<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import type { Snippet } from 'svelte';
	import { dev } from '$app/env';
	import { page } from '$app/state';
	import PageBoundary from '#lib/components/navigation/PageBoundary.svelte';
	import { boundaryKey } from '#lib/helpers/boundaryKey';
	import { DASHBOARD_SKELETON, PAGE_SKELETON } from '#lib/components/navigation/skeletonShapes';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();

	// A fresh boundary per page shows its skeleton at once on a client-side navigation. The paper
	// hub's pages sit in a shell of their own (`paperhub/+layout.svelte`, the team shell), which
	// must not be re-created between them; it shows the skeleton for its pages itself.
	const pathname = $derived(page.url.pathname);
	const pageKey = $derived(boundaryKey({ pathname, frames: ['paperhub'] }));
	const skeleton = $derived(
		page.route.id === '/(authenticated)/dashboard/[conferenceId]'
			? DASHBOARD_SKELETON
			: PAGE_SKELETON
	);
</script>

<svelte:head>
	<title>{dev ? '[dev] ' : ''}MUNify Delegator - {m.dashboard()}</title>
</svelte:head>

<div class="flex w-full">
	<PageBoundary key={pageKey} {skeleton}>
		{@render children()}
	</PageBoundary>
</div>
