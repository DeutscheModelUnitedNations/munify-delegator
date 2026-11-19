<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import type { Snippet } from 'svelte';
	import { dev } from '$app/env';
	import { page } from '$app/state';
	import PageBoundary from '#lib/components/navigation/PageBoundary.svelte';
	import { PAGE_SKELETON } from '#lib/components/navigation/skeletonShapes';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();

	// The pages that are not about one conference: the list of conferences and the administration.
	// A conference's own pages leave this layout (`[conferenceId]/+layout@(authenticated).svelte`).
	// A fresh boundary per page shows its skeleton at once on a client-side navigation.
	const pathname = $derived(page.url.pathname);
</script>

<svelte:head>
	<title>{dev ? '[dev] ' : ''}MUNify Delegator - {m.conferences()}</title>
</svelte:head>

<div class="flex w-full">
	<PageBoundary key={pathname} skeleton={PAGE_SKELETON}>
		{@render children()}
	</PageBoundary>
</div>
