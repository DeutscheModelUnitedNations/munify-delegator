<!--
	@component
	What the dashboard offers a team member: one entry into the team area (whose side navigation,
	read from the route registry, lists its pages) and the links the conference and the app give the
	team, as plain cards with no box or heading around them. Cards carry live details of their own,
	such as what is on right now. No team page is linked directly from here.
-->
<script lang="ts">
	import DashboardLinkCards from '#lib/components/dashboard/DashboardLinkCards.svelte';
	import { client } from '#lib/api/rumbleClient/client';
	import { fetchTeamAccess } from '#lib/api/teamAccess';
	import { PUBLIC_DOCS_URL } from '$app/env/public';
	import { fetchCanOpenPaperHub } from '../../paperhub/myPaperHubRoles';
	import {
		getPaperHubLink,
		getTeamEntryLink,
		getTeamResourceLinks,
		type TeamDashboardLinkContext
	} from '#lib/data/teamDashboardLinks';

	let { conferenceId }: { conferenceId: string } = $props();

	const conference = $derived(
		await client.liveQuery.conference({
			__args: { id: conferenceId },
			linkToTeamWiki: true,
			linkToServicesPage: true,
			linkToPreparationGuide: true
		})
	);
	const access = $derived(await fetchTeamAccess(conferenceId));

	// A snapshot of a boolean, decided the same way as the team navigation's paper hub entry
	const canSeePaperHub = $derived(await fetchCanOpenPaperHub(conferenceId));

	const context = $derived<TeamDashboardLinkContext>({
		conferenceId,
		linkToTeamWiki: conference.linkToTeamWiki,
		linkToServicesPage: conference.linkToServicesPage,
		linkToPreparationGuide: conference.linkToPreparationGuide,
		docsUrl: PUBLIC_DOCS_URL
	});
	const links = $derived(
		[
			getTeamEntryLink(access),
			...getTeamResourceLinks(context),
			getPaperHubLink(canSeePaperHub)
		].filter((link) => link !== undefined)
	);
</script>

<DashboardLinkCards {links} {context} {conferenceId} />
