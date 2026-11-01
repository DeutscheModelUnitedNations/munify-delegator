<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import RoleWidget from '#lib/components/delegationStats/RoleWidget.svelte';
	import DashboardSection from '#lib/components/dashboard/DashboardSection.svelte';
	import type { MyConferenceParticipation } from '#lib/api/myConferenceParticipation';
	import SupervisorTable from '../Common/SupervisorTable.svelte';

	interface Props {
		conferenceId: string;
		singleParticipant: NonNullable<MyConferenceParticipation['singleParticipant']>;
	}

	let { conferenceId, singleParticipant }: Props = $props();
</script>

<DashboardSection icon="masks-theater" title={m.role()} description={m.roleDescription()}>
	<div class="stats bg-base-200 shadow">
		<RoleWidget customConferenceRole={singleParticipant.assignedRole} />
	</div>
</DashboardSection>

<SupervisorTable singleParticipantId={singleParticipant.id} {conferenceId} />
