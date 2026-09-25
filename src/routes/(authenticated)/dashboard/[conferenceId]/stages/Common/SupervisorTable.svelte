<script lang="ts">
	import DashboardSection from '$lib/components/dashboard/DashboardSection.svelte';
	import DelegationStatusTableWrapper from '$lib/components/delegationStatusTable/Wrapper.svelte';
	import DelegationStatusTableEntry from '$lib/components/delegationStatusTable/Entry.svelte';
	import { m } from '$lib/paraglide/messages';
	import formatNames from '$lib/helpers/formatNames';
	import type { MyConferenceParticipation } from '$lib/api/myConferenceParticipation';

	interface Props {
		supervisors: NonNullable<MyConferenceParticipation['delegationMember']>['supervisors'];
		conferenceId: string;
	}

	let { supervisors, conferenceId }: Props = $props();
</script>

<DashboardSection
	icon="chalkboard-user"
	title={m.supervisors()}
	description={m.supervisorsDescription()}
>
	{#if supervisors && supervisors.length > 0}
		<DelegationStatusTableWrapper withEmail>
			{#each supervisors as supervisor}
				<DelegationStatusTableEntry
					name={formatNames(supervisor.user.givenName, supervisor.user.familyName)}
					pronouns={supervisor.user.pronouns}
					email={supervisor.user.email}
				/>
			{/each}
		</DelegationStatusTableWrapper>
	{/if}

	<a class="btn btn-primary mt-4 self-start" href="/dashboard/{conferenceId}/connectSupervisor">
		<i class="fas fa-plus mr-2"></i>
		{m.connectSupervisor()}
	</a>
</DashboardSection>
