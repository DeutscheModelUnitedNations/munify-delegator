<!--
	@component
	What the conference's overview offers a team member: what waits for them in the team (the side
	navigation beside it lists the team's pages), then the links the conference and the app give the
	team, as plain cards with no box or heading around them. Cards carry live details of their own,
	such as what is on right now.
-->
<script lang="ts">
	import DashboardLinkCards from '#lib/components/dashboard/DashboardLinkCards.svelte';
	import ChaseStatusCard from './ChaseStatusCard.svelte';
	import TeamWaiting from './TeamWaiting.svelte';
	import { client } from '#lib/api/rumbleClient/client';
	import { PUBLIC_DOCS_URL } from '$app/env/public';
	import { getTeamResourceLinks, type TeamDashboardLinkContext } from './teamDashboardLinks';

	let { conferenceId }: { conferenceId: string } = $props();

	const conference = $derived(
		await client.liveQuery.conference({
			__args: { id: conferenceId },
			linkToTeamWiki: true,
			linkToServicesPage: true,
			linkToPreparationGuide: true
		})
	);

	const context = $derived<TeamDashboardLinkContext>({
		conferenceId,
		linkToTeamWiki: conference.linkToTeamWiki,
		linkToServicesPage: conference.linkToServicesPage,
		linkToPreparationGuide: conference.linkToPreparationGuide,
		docsUrl: PUBLIC_DOCS_URL
	});
	const links = $derived(getTeamResourceLinks(context));
</script>

<TeamWaiting {conferenceId} />
<DashboardLinkCards {links} {context} {conferenceId} />
<ChaseStatusCard {conferenceId} />
