<script lang="ts">
	import type { CurrentUser } from '$lib/state/currentUser.svelte';
	import { m } from '$lib/paraglide/messages';
	import RoleWidget from '$lib/components/delegationStats/RoleWidget.svelte';
	import DashboardSection from '$lib/components/dashboard/DashboardSection.svelte';
	import type { MyConferenceParticipation } from '$lib/api/myConferenceParticipation';
	import SupervisorTable from '../Common/SupervisorTable.svelte';
	import DashboardQuickLinks from '../../sections/DashboardQuickLinks.svelte';

	interface Props {
		conferenceId: string;
		singleParticipant: NonNullable<MyConferenceParticipation['singleParticipant']>;
		user: CurrentUser;
		status: MyConferenceParticipation['participantStatus'];
		ofAgeAtConference: boolean;
	}

	let { conferenceId, singleParticipant, user, status, ofAgeAtConference }: Props = $props();
</script>

<DashboardQuickLinks
	{conferenceId}
	userType="singleParticipant"
	{user}
	{status}
	{ofAgeAtConference}
/>

<DashboardSection icon="masks-theater" title={m.role()} description={m.roleDescription()}>
	<div class="stats bg-base-200 shadow">
		<RoleWidget customConferenceRole={singleParticipant.assignedRole} />
	</div>
</DashboardSection>

<SupervisorTable singleParticipantId={singleParticipant.id} {conferenceId} />
