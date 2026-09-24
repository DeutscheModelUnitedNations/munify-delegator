<script lang="ts">
	import DashboardSection from '$lib/components/dashboard/DashboardSection.svelte';
	import DashboardLinkCard from '$lib/components/dashboard/DashboardLinkCard.svelte';
	import DashboardLinksGrid from '$lib/components/dashboard/DashboardLinksGrid.svelte';
	import { m } from '$lib/paraglide/messages';
	import { translateTeamRole } from '$lib/utils/enumTranslations';
	import type { TeamRole } from '@prisma/client';
	import { getTeamLinksForRole, type TeamDashboardLinkContext } from '$lib/data/teamDashboardLinks';

	interface Props {
		conferenceId: string;
		conferenceTitle: string;
		role: TeamRole;
		linkToTeamWiki?: string | null;
		linkToServicesPage?: string | null;
		linkToPreparationGuide?: string | null;
		docsUrl?: string | null;
	}

	let {
		conferenceId,
		conferenceTitle,
		role,
		linkToTeamWiki,
		linkToServicesPage,
		linkToPreparationGuide,
		docsUrl
	}: Props = $props();

	let linkContext = $derived<TeamDashboardLinkContext>({
		conferenceId,
		role,
		linkToTeamWiki,
		linkToServicesPage,
		linkToPreparationGuide,
		docsUrl
	});

	let visibleLinks = $derived(getTeamLinksForRole(linkContext));
</script>

<DashboardSection
	icon="users-gear"
	title={m.teamMemberDashboard()}
	description={`${conferenceTitle} · ${translateTeamRole(role)}`}
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
