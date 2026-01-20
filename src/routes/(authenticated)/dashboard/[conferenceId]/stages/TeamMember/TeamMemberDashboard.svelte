<script lang="ts">
	import DashboardSection from '$lib/components/Dashboard/DashboardSection.svelte';
	import DashboardLinkCard from '$lib/components/Dashboard/DashboardLinkCard.svelte';
	import DashboardLinksGrid from '$lib/components/Dashboard/DashboardLinksGrid.svelte';
	import { m } from '$lib/paraglide/messages';
	import { translateTeamRole } from '$lib/services/enumTranslations';
	import type { TeamRole } from '@prisma/client';

	interface Props {
		conferenceId: string;
		conferenceTitle: string;
		role: TeamRole;
	}

	let { conferenceId, conferenceTitle, role }: Props = $props();

	let canAccessPaperHub = $derived(role === 'REVIEWER' || role === 'PROJECT_MANAGEMENT');
	let canAccessAdministration = $derived(
		role === 'PARTICIPANT_CARE' || role === 'PROJECT_MANAGEMENT'
	);
</script>

<DashboardSection
	icon="users-gear"
	title={m.teamMemberDashboard()}
	description={`${conferenceTitle} · ${translateTeamRole(role)}`}
>
	<DashboardLinksGrid>
		{#if canAccessPaperHub}
			<DashboardLinkCard
				href="/dashboard/{conferenceId}/paperhub"
				icon="files"
				title={m.paperHub()}
				description={m.reviewPapers()}
			/>
		{/if}
		{#if canAccessAdministration}
			<DashboardLinkCard
				href="/management/{conferenceId}"
				icon="bars-progress"
				title={m.administration()}
				description={m.manageConference()}
			/>
		{/if}
	</DashboardLinksGrid>
</DashboardSection>
