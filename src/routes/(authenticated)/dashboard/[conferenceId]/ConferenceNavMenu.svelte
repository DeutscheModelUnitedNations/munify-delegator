<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages';
	import NavMenu from '#lib/components/navMenu/NavMenu.svelte';
	import NavMenuButton from '#lib/components/navMenu/NavMenuButton.svelte';
	import NavMenuDetails from '#lib/components/navMenu/NavMenuDetails.svelte';
	import {
		teamRelativePath,
		teamRouteForPath,
		teamRouteGroupTitle,
		type groupedTeamRoutes,
		type TeamRoute
	} from '#lib/data/teamRoutes';
	import PlausibilityNavButton from './team/PlausibilityNavButton.svelte';
	import CleanupNavButton from './team/CleanupNavButton.svelte';
	import MessagesNavButton from './team/MessagesNavButton.svelte';
	import { helpForRoute, takeTour } from '#lib/docs/help';

	/**
	 * The menu itself: the conference's overview, then the registry's sections, each page a button,
	 * the open one marked.
	 */
	let {
		conferenceId,
		sections
	}: { conferenceId: string; sections: ReturnType<typeof groupedTeamRoutes> } = $props();

	const relativePath = $derived(teamRelativePath({ pathname: page.url.pathname, conferenceId }));
	const openRoute = $derived(teamRouteForPath(relativePath));

	const groupIcon = {
		main: 'ph-house',
		workflows: 'ph-arrows-clockwise',
		info: 'ph-chats',
		maintenance: 'ph-toolbox'
	} as const;

	// The manual's page about the team page on screen, or the manual's start
	const help = $derived(helpForRoute(page.route.id));
	const tour = $derived(help.tour);

	const hrefOf = (route: TeamRoute) => resolve(`dashboard/${conferenceId}/${route.path}`);
</script>

{#snippet entry(route: TeamRoute)}
	{#if route.id === 'plausibility' || route.id === 'cleanup' || route.id === 'messages'}
		<!-- the count is fetched on its own, so the menu does not wait for it -->
		<svelte:boundary>
			{#if route.id === 'plausibility'}
				<PlausibilityNavButton {conferenceId} active={openRoute?.id === route.id} />
			{:else if route.id === 'messages'}
				<MessagesNavButton {conferenceId} active={openRoute?.id === route.id} />
			{:else}
				<CleanupNavButton {conferenceId} active={openRoute?.id === route.id} />
			{/if}

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
		icon="ph-squares-four"
		title={m.overview()}
		active={relativePath === ''}
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
	<li class="menu-title p-0"><div class="divider my-1"></div></li>
	<li>
		<!-- eslint-disable svelte/no-navigation-without-resolve -- helpForRoute resolves the manual's path, then adds the locale prefix and the section -->
		<a
			href={help.manualHref}
			target="_blank"
			rel="noopener noreferrer"
			data-testid="team-manual-link"
		>
			<i aria-hidden="true" class="ph-duotone ph-book w-5 text-center"></i>
			<span class="flex-1">{help.specific ? m.helpManualForPage() : m.helpManual()}</span>
			<i class="ph-duotone ph-arrow-up-right text-base-content/50 text-xs" aria-hidden="true"></i>
		</a>
		<!-- eslint-enable svelte/no-navigation-without-resolve -->
	</li>
	{#if tour}
		<li>
			<button
				type="button"
				onclick={() => takeTour(tour)}
				data-testid="team-tour-button"
				data-close-drawer
			>
				<i aria-hidden="true" class="ph-duotone ph-signpost w-5 text-center"></i>
				<span class="flex-1 text-left">{m.tourStart()}</span>
			</button>
		</li>
	{/if}
</NavMenu>
