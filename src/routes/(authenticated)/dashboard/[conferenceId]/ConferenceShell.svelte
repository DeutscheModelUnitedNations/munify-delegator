<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/state';
	import PageBoundary from '#lib/components/navigation/PageBoundary.svelte';
	import { DASHBOARD_SKELETON } from '#lib/components/navigation/skeletonShapes';
	import { boundaryKey } from '#lib/helpers/boundaryKey';
	import SideNavigationDrawer from '#lib/components/SideNavigationDrawer.svelte';
	import CommandPalette from '#lib/components/commandPalette/CommandPalette.svelte';
	import SearchHistoryWatcher from '#lib/components/commandPalette/SearchHistoryWatcher.svelte';
	import { fetchTeamAccess } from '#lib/api/teamAccess';
	import { hasAnyRole, isOnTeam, NO_TEAM_ACCESS } from '#lib/helpers/teamAccess';
	import { rememberTeamConference } from '#lib/state/lastTeamConference.svelte.js';
	import { getOptionalCurrentUser } from '#lib/state/currentUser.svelte.js';
	import { setConferenceMenu } from '#lib/state/conferenceMenu.svelte.js';
	import { headerState } from '#lib/state/authenticatedHeaderStatus.svelte.js';
	import { PARTICIPANT_CARE_ROLES } from '#lib/helpers/teamRoles';
	import { groupedTeamRoutes, teamRelativePath, teamSkeletonForPath } from '#lib/data/teamRoutes';
	import ConferenceNavMenu from './ConferenceNavMenu.svelte';
	import { fetchCanOpenPaperHub } from './paperhub/myPaperHubRoles';

	/**
	 * The frame of every page of one conference. Its team gets one side navigation for the whole
	 * conference: the overview (the conference's dashboard) first, then `#lib/data/teamRoutes`
	 * filtered by what the caller may open, so a page is in the menu exactly when the route guard
	 * lets them in. Everybody else gets the pages alone, each with its own way back.
	 */
	let { children, conferenceId }: { children: Snippet; conferenceId: string } = $props();

	// Before the first `await`, where a context can still be set; read only once `onTeam` is there
	setConferenceMenu({
		get shown() {
			return onTeam;
		}
	});

	// Seeded once: who is signed in does not change while the page is open, and a visitor (who may
	// look at a conference's dashboard) has no team to ask about.
	const signedIn = (await getOptionalCurrentUser()) !== null;
	const access = $derived(signedIn ? await fetchTeamAccess(conferenceId) : NO_TEAM_ACCESS);
	const onTeam = $derived(isOnTeam(access));
	// A snapshot of a boolean: the menu does not need to follow a role change live
	const canSeePaperHub = $derived(onTeam ? await fetchCanOpenPaperHub(conferenceId) : false);
	const sections = $derived(groupedTeamRoutes({ ...access, canSeePaperHub }));
	const hasCarePages = $derived(hasAnyRole({ access, roles: PARTICIPANT_CARE_ROLES }));

	// The home page offers the way back here
	$effect(() => {
		if (onTeam) rememberTeamConference(conferenceId);
	});

	// The menu's head names the conference, so the breadcrumbs need not
	$effect(() => {
		headerState.conferenceMenu = onTeam;
		return () => {
			headerState.conferenceMenu = false;
		};
	});

	// Every navigation gets a fresh boundary, so the next page's skeleton shows right away. The
	// assignment keeps its tabs and draft status across its pages, the paper hub its back link, and
	// both show the skeleton below that themselves, so their pages share one key here.
	const pathname = $derived(page.url.pathname);
	const pageKey = $derived(boundaryKey({ pathname, frames: ['team/assignment', 'paperhub'] }));
	const relativePath = $derived(teamRelativePath({ pathname, conferenceId }));
	const skeleton = $derived(
		relativePath === '' ? DASHBOARD_SKELETON : teamSkeletonForPath(relativePath)
	);
</script>

<div class="flex min-w-0 grow basis-0 overflow-x-clip">
	{#if onTeam}
		<SideNavigationDrawer>
			<ConferenceNavMenu {conferenceId} {sections} />
		</SideNavigationDrawer>
	{/if}

	<div class={['flex h-full min-w-0 grow flex-col', onTeam && 'sm:px-3']}>
		<PageBoundary key={pageKey} {skeleton}>
			{@render children()}
		</PageBoundary>
	</div>
</div>

{#if hasCarePages}
	<CommandPalette {conferenceId} {access} />
	<SearchHistoryWatcher {conferenceId} />
{/if}
