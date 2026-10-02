<script lang="ts">
	import DashboardSection from '$lib/components/dashboard/DashboardSection.svelte';
	import DashboardLinkCard from '$lib/components/dashboard/DashboardLinkCard.svelte';
	import DashboardLinksGrid from '$lib/components/dashboard/DashboardLinksGrid.svelte';
	import { m } from '$lib/paraglide/messages';
	import { translateTeamRole } from '$lib/utils/enumTranslations';
	import type { TeamroleEnum } from '$lib/api/rumbleClient/client';
	import { getTeamLinksForRole, type TeamDashboardLinkContext } from '$lib/data/teamDashboardLinks';
	import { client } from '$lib/api/rumbleClient/client';
	import { configPublic } from '$config/public';

	interface Props {
		conferenceId: string;
		role: TeamroleEnum;
	}

	let { conferenceId, role }: Props = $props();

	const conference = $derived(
		await client.liveQuery.conference({
			__args: { id: conferenceId },
			title: true,
			linkToTeamWiki: true,
			linkToServicesPage: true,
			linkToPreparationGuide: true
		})
	);

	let linkContext = $derived<TeamDashboardLinkContext>({
		conferenceId,
		role,
		linkToTeamWiki: conference.linkToTeamWiki,
		linkToServicesPage: conference.linkToServicesPage,
		linkToPreparationGuide: conference.linkToPreparationGuide,
		docsUrl: configPublic.PUBLIC_DOCS_URL
	});

	let visibleLinks = $derived(getTeamLinksForRole(linkContext));
</script>

<DashboardSection
	icon="users-gear"
	title={m.teamMemberDashboard()}
	description={`${conference.title} · ${translateTeamRole(role)}`}
>
	<DashboardLinksGrid>
		{#each visibleLinks as link (link.id)}
			<DashboardLinkCard
				href={link.getHref(linkContext)}
				icon={link.icon}
				title={link.getTitle()}
				description={link.getDescription()}
				external={link.external}
			/>
		{/each}
	</DashboardLinksGrid>
</DashboardSection>
