<script lang="ts">
	import type { Snippet } from 'svelte';
	import SideNavigationDrawer from '$lib/components/SideNavigationDrawer.svelte';
	import CommandPalette from '$lib/components/commandPalette/CommandPalette.svelte';
	import SearchHistoryWatcher from '$lib/components/commandPalette/SearchHistoryWatcher.svelte';
	import { fetchTeamAccess } from '$lib/api/teamAccess';
	import { hasAnyRole } from '$lib/helpers/teamAccess';
	import { PARTICIPANT_CARE_ROLES } from '$lib/helpers/teamRoles';
	import { groupedTeamRoutes } from '$lib/data/teamRoutes';
	import TeamNavMenu from './TeamNavMenu.svelte';
	import { fetchCanOpenPaperHub } from '../paperhub/myPaperHubRoles';

	/**
	 * The side navigation of the team area, and of the paper hub, which sits in the same menu. It
	 * is nothing but `$lib/data/teamRoutes` filtered by what the caller may open: a page is in the
	 * menu exactly when the route guard lets them in.
	 */
	let { children, conferenceId }: { children: Snippet; conferenceId: string } = $props();

	const access = $derived(await fetchTeamAccess(conferenceId));
	// A snapshot of a boolean: the menu does not need to follow a role change live
	const canSeePaperHub = $derived(await fetchCanOpenPaperHub(conferenceId));
	const sections = $derived(groupedTeamRoutes({ ...access, canSeePaperHub }));
	// A menu with a single entry is no navigation: the page already is that entry
	const showMenu = $derived(
		sections.reduce((count, section) => count + section.routes.length, 0) > 1
	);
	const hasCarePages = $derived(hasAnyRole(access, PARTICIPANT_CARE_ROLES));
</script>

<div class="flex min-w-0 grow basis-0 overflow-x-clip">
	{#if showMenu}
		<SideNavigationDrawer>
			<TeamNavMenu {conferenceId} {sections} />
		</SideNavigationDrawer>
	{/if}

	<div class="flex h-full min-w-0 grow flex-col px-3">
		{@render children()}
	</div>
</div>

{#if hasCarePages}
	<CommandPalette {conferenceId} {access} />
	<SearchHistoryWatcher {conferenceId} />
{/if}
