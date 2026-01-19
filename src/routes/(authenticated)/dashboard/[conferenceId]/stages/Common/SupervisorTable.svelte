<script lang="ts">
	import DashboardContentCard from '$lib/components/Dashboard/DashboardContentCard.svelte';
	import DelegationStatusTableWrapper from '$lib/components/DelegationStatusTable/Wrapper.svelte';
	import DelegationStatusTableEntry from '$lib/components/DelegationStatusTable/Entry.svelte';
	import { m } from '$lib/paraglide/messages';
	import formatNames from '$lib/services/formatNames';
	import type { MyConferenceparticipationQuery$result } from '$houdini';

	interface Props {
		supervisors: NonNullable<
			MyConferenceparticipationQuery$result['findUniqueDelegationMember']
		>['supervisors'];
		conferenceId: string;
	}

	let { supervisors, conferenceId }: Props = $props();
</script>

<DashboardContentCard title={m.supervisors()} description={m.addSupervisorsDescription()}>
	{#if supervisors && supervisors.length > 0}
		<DelegationStatusTableWrapper withEmail>
			{#each supervisors as supervisor}
				<DelegationStatusTableEntry
					name={formatNames(supervisor.user.given_name, supervisor.user.family_name)}
					pronouns={supervisor.user.pronouns}
					email={supervisor.user.email}
				/>
			{/each}
		</DelegationStatusTableWrapper>
	{/if}

	<a class="btn btn-primary mt-6 self-start" href="/dashboard/{conferenceId}/connectSupervisor">
		<i class="fas fa-plus mr-2"></i>
		{m.connectSupervisor()}
	</a>
</DashboardContentCard>
