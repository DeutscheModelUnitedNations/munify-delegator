<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/state';
	import PageBoundary from '#lib/components/navigation/PageBoundary.svelte';
	import { boundaryKey } from '#lib/helpers/boundaryKey';
	import SideNavigationDrawer from '#lib/components/SideNavigationDrawer.svelte';
	import CommandPalette from '#lib/components/commandPalette/CommandPalette.svelte';
	import SearchHistoryWatcher from '#lib/components/commandPalette/SearchHistoryWatcher.svelte';
	import { fetchTeamAccess } from '#lib/api/teamAccess';
	import { hasAnyRole, isOnTeam } from '#lib/helpers/teamAccess';
	import { rememberTeamConference } from '#lib/state/lastTeamConference.svelte.js';
	import { PARTICIPANT_CARE_ROLES } from '#lib/helpers/teamRoles';
	import { groupedTeamRoutes, teamRelativePath, teamSkeletonForPath } from '#lib/data/teamRoutes';
	import TeamNavMenu from './TeamNavMenu.svelte';
	import { fetchCanOpenPaperHub } from '../paperhub/myPaperHubRoles';

	/**
	 * The side navigation of the team area, and of the paper hub, which sits in the same menu. It
	 * is nothing but `#lib/data/teamRoutes` filtered by what the caller may open: a page is in the
	 * menu exactly when the route guard lets them in.
	 */
	let {
		children,
		conferenceId,
		withoutMenu
	}: {
		children: Snippet;
		conferenceId: string;
		/** Shown above the page when there is no menu, which would hold the way back otherwise */
		withoutMenu?: Snippet;
	} = $props();

	const access = $derived(await fetchTeamAccess(conferenceId));
	// A snapshot of a boolean: the menu does not need to follow a role change live
	const canSeePaperHub = $derived(await fetchCanOpenPaperHub(conferenceId));
	const sections = $derived(groupedTeamRoutes({ ...access, canSeePaperHub }));
	// A menu with a single entry is no navigation: the page already is that entry
	const showMenu = $derived(
		sections.reduce((count, section) => count + section.routes.length, 0) > 1
	);
	const hasCarePages = $derived(hasAnyRole({ access, roles: PARTICIPANT_CARE_ROLES }));

	// The home page offers the way back here; participants reach the paper hub through this shell too
	$effect(() => {
		if (isOnTeam(access)) rememberTeamConference(conferenceId);
	});

	// Every navigation gets a fresh boundary, so the next page's skeleton shows right away. The
	// assignment keeps its tabs and draft status across its pages and shows the skeleton below them
	// itself (`assignment/+layout.svelte`), so its pages share one key here.
	const pathname = $derived(page.url.pathname);
	const pageKey = $derived(boundaryKey({ pathname, frames: ['team/assignment'] }));
	const skeleton = $derived(teamSkeletonForPath(teamRelativePath({ pathname, conferenceId })));
</script>

<div class="flex min-w-0 grow basis-0 overflow-x-clip">
	{#if showMenu}
		<SideNavigationDrawer>
			<TeamNavMenu {conferenceId} {sections} />
		</SideNavigationDrawer>
	{/if}

	<div class="flex h-full min-w-0 grow flex-col sm:px-3">
		{#if !showMenu}
			{@render withoutMenu?.()}
		{/if}
		<PageBoundary key={pageKey} {skeleton}>
			{@render children()}
		</PageBoundary>
	</div>
</div>

{#if hasCarePages}
	<CommandPalette {conferenceId} {access} />
	<SearchHistoryWatcher {conferenceId} />
{/if}
