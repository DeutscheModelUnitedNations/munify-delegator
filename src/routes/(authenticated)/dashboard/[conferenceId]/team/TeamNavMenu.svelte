<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages.js';
	import NavMenu from '#lib/components/navMenu/NavMenu.svelte';
	import NavMenuButton from '#lib/components/navMenu/NavMenuButton.svelte';
	import NavMenuDetails from '#lib/components/navMenu/NavMenuDetails.svelte';
	import {
		teamRouteForPath,
		teamRouteGroupTitle,
		type groupedTeamRoutes,
		type TeamRoute
	} from '#lib/data/teamRoutes.js';
	import PlausibilityNavButton from './PlausibilityNavButton.svelte';

	/** The menu itself: the registry's sections, each page a button, the open one marked. */
	let {
		conferenceId,
		sections
	}: { conferenceId: string; sections: ReturnType<typeof groupedTeamRoutes> } = $props();

	const base = $derived(`/dashboard/${conferenceId}/`);
	const openRoute = $derived(teamRouteForPath(page.url.pathname.replace(base, '')));

	const groupIcon = {
		main: 'fa-house',
		workflows: 'fa-arrows-spin',
		info: 'fa-comments',
		maintenance: 'fa-toolbox'
	} as const;

	const hrefOf = (route: TeamRoute) => resolve(`dashboard/${conferenceId}/${route.path}`);
</script>

{#snippet entry(route: TeamRoute)}
	{#if route.id === 'plausibility'}
		<!-- the count is fetched on its own, so the menu does not wait for it -->
		<svelte:boundary>
			<PlausibilityNavButton {conferenceId} active={openRoute?.id === route.id} />

			{#snippet pending()}
				<NavMenuButton
					href={hrefOf(route)}
					icon={route.icon}
					title={route.title()}
					active={openRoute?.id === route.id}
				/>
			{/snippet}
		</svelte:boundary>
	{:else}
		<NavMenuButton
			href={hrefOf(route)}
			icon={route.icon}
			title={route.title()}
			active={openRoute?.id === route.id}
		/>
	{/if}
{/snippet}

<NavMenu>
	<NavMenuButton
		href={resolve(`dashboard/${conferenceId}`)}
		icon="fa-arrow-left"
		title={m.backToDashboard()}
		active={false}
	/>
	<li class="menu-title p-0"><div class="divider my-1"></div></li>
	{#each sections as section (section.group)}
		{#if section.group === 'main'}
			{#each section.routes as route (route.id)}
				{@render entry(route)}
			{/each}
		{:else}
			<NavMenuDetails title={teamRouteGroupTitle[section.group]()} icon={groupIcon[section.group]}>
				{#each section.routes as route (route.id)}
					{@render entry(route)}
				{/each}
			</NavMenuDetails>
		{/if}
	{/each}
</NavMenu>
