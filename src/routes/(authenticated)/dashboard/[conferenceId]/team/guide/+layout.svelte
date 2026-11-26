<script lang="ts">
	import { untrack } from 'svelte';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { client } from '#lib/api/rumbleClient/client';
	import { m } from '#lib/paraglide/messages';
	import Tab from '#lib/components/tabs/Tab.svelte';
	import Tabs from '#lib/components/tabs/Tabs.svelte';
	import PageBoundary from '#lib/components/navigation/PageBoundary.svelte';
	import { GUIDE_TAB_SKELETONS } from '#lib/data/teamSkeletons';
	import { EMPTY_OUTLINE, parseOutline } from '#lib/guide/outline';
	import ParticipantViewLink from '../ParticipantViewLink.svelte';
	import { createOutlineDraft, setOutlineDraft } from './outlineDraft.svelte';
	import GuideTree from './tree/GuideTree.svelte';
	import type { LayoutProps } from './$types';

	/**
	 * The guide workspace: one frame for its tabs. "Structure" is the tree with the page editor
	 * beside it, "Visibility" who sees what, "Committees" the template's pages per committee. All
	 * of them edit the one sidebar draft held here (`createOutlineDraft`).
	 */
	let { children, params }: LayoutProps = $props();

	// Read once: the team shell keeps this frame across the guide's pages (`boundaryKey`)
	const conferenceId = untrack(() => params.conferenceId);
	const activePageId = $derived(params.pageId);

	// the context is set before any `await` (Svelte allows it only then); the draft is seeded once
	// and then edited here, saving itself
	const draft = createOutlineDraft({ conferenceId, initial: EMPTY_OUTLINE });
	setOutlineDraft(draft);
	const seed = await client.query.guideOutlineOf({
		__args: { conferenceId },
		draft: true,
		draftUpdatedAt: true
	});
	draft.replace(seed ? parseOutline(seed.draft) : EMPTY_OUTLINE, seed ? seed.draftUpdatedAt : null);

	const TABS = [
		{ id: 'structure', path: '', title: () => m.guideTabStructure(), icon: 'tree-structure' },
		{ id: 'visibility', path: '/visibility', title: () => m.guideTabVisibility(), icon: 'eye' },
		{
			id: 'committees',
			path: '/committees',
			title: () => m.guideTabCommittees(),
			icon: 'grid-four'
		}
	] as const;

	// The route id is fixed per page, unlike `page.params`, so reading it here is safe.
	const tab = $derived.by(() => {
		const rest = page.route.id?.split('/team/guide')[1] ?? '';
		if (rest.startsWith('/visibility')) return 'visibility';
		if (rest.startsWith('/committees')) return 'committees';
		return 'structure';
	});
	const pathname = $derived(page.url.pathname);
	const skeleton = $derived(
		GUIDE_TAB_SKELETONS[activePageId ? 'page' : tab] ?? GUIDE_TAB_SKELETONS.structure
	);
</script>

<svelte:head>
	<title>{m.guideTeamPages()}</title>
</svelte:head>

<div class="flex w-full flex-col gap-2 py-4">
	<header class="flex flex-wrap items-center gap-3">
		<div class="flex min-w-0 flex-col">
			<h1 class="text-2xl font-bold">{m.guideTeamPages()}</h1>
			<p class="text-sm opacity-70">{m.guideTeamPagesDescription()}</p>
		</div>
		<div class="ml-auto"><ParticipantViewLink {conferenceId} of="guide" /></div>
	</header>

	<Tabs tourAnchor="team.guide.tabs">
		{#each TABS as entry (entry.id)}
			<Tab
				active={tab === entry.id}
				title={entry.title()}
				icon={entry.icon}
				href={resolve(`/(authenticated)/dashboard/[conferenceId]/team/guide${entry.path}`, {
					conferenceId
				})}
			/>
		{/each}
	</Tabs>

	{#if tab === 'structure'}
		<div class="flex flex-col gap-4 lg:flex-row lg:items-start">
			<div class="lg:w-80 lg:shrink-0 xl:w-96">
				<GuideTree {conferenceId} {activePageId} />
			</div>
			<div class="min-w-0 flex-1">
				<PageBoundary key={pathname} {skeleton}>
					{@render children()}
				</PageBoundary>
			</div>
		</div>
	{:else}
		<PageBoundary key={pathname} {skeleton}>
			{@render children()}
		</PageBoundary>
	{/if}
</div>
