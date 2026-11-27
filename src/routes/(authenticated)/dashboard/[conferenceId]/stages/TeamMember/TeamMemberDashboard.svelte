<!--
	@component
	What the conference's overview offers a team member: what waits for them in the team (the side
	navigation beside it lists the team's pages), then the widgets of the conference's current
	state that the caller's pages allow (`widgetsFor`), each answering one question and linking to
	where it is worked on, then the links the conference and the app give the team.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import DashboardLinkCards from '#lib/components/dashboard/DashboardLinkCards.svelte';
	import DashboardLinksGrid from '#lib/components/dashboard/DashboardLinksGrid.svelte';
	import { client } from '#lib/api/rumbleClient/client';
	import { fetchTeamAccess } from '#lib/api/teamAccess';
	import { PUBLIC_DOCS_URL } from '$app/env/public';
	import { fetchCanOpenPaperHub } from '../../paperhub/myPaperHubRoles';
	import TeamWaiting from './TeamWaiting.svelte';
	import WidgetSlot from './WidgetSlot.svelte';
	import { getTeamResourceLinks, type TeamDashboardLinkContext } from './teamDashboardLinks';
	import { tilesShownByWidgets, widgetsFor } from './teamWidgets';

	let { conferenceId }: { conferenceId: string } = $props();

	const [conference, teamAccess, canSeePaperHub] = $derived(
		await Promise.all([
			client.liveQuery.conference({
				__args: { id: conferenceId },
				state: true,
				linkToTeamWiki: true,
				linkToServicesPage: true,
				linkToPreparationGuide: true
			}),
			fetchTeamAccess(conferenceId),
			fetchCanOpenPaperHub(conferenceId)
		])
	);

	// A plain object of snapshots: widgets take it as a prop, never a live result
	const access = $derived({ ...teamAccess, canSeePaperHub });
	const conferenceState = $derived(conference.state);
	const widgets = $derived(widgetsFor({ state: conferenceState, access }));
	const hiddenTiles = $derived(tilesShownByWidgets(widgets));

	const context = $derived<TeamDashboardLinkContext>({
		conferenceId,
		linkToTeamWiki: conference.linkToTeamWiki,
		linkToServicesPage: conference.linkToServicesPage,
		linkToPreparationGuide: conference.linkToPreparationGuide,
		docsUrl: PUBLIC_DOCS_URL
	});
	const links = $derived(getTeamResourceLinks(context));

	// The widgets load their own data, and several next to each other do not hydrate (the same as
	// the link cards' live details, see `DashboardLinkCards`): they mount in the browser only.
	let mounted = $state(false);
	onMount(() => {
		mounted = true;
	});
</script>

<div class="flex flex-col gap-6">
	<DashboardLinksGrid>
		<TeamWaiting {conferenceId} hide={hiddenTiles} />
	</DashboardLinksGrid>

	{#if mounted && widgets.length > 0}
		<div
			class="grid grid-cols-1 items-start gap-4 lg:grid-cols-2"
			data-testid="team-widgets"
			data-tour="team.overview.widgets"
			data-state={conferenceState}
		>
			{#each widgets as widget (widget.id)}
				<WidgetSlot {conferenceId} {widget} {access} />
			{/each}
		</div>
	{/if}

	{#if links.length > 0}
		<DashboardLinkCards {links} {context} {conferenceId} />
	{/if}
</div>
