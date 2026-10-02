<script lang="ts">
	import { resolve } from '$app/paths';
	import DashboardSection from '$lib/components/dashboard/DashboardSection.svelte';
	import DelegationStatusTableWrapper from '$lib/components/delegationStatusTable/Wrapper.svelte';
	import DelegationStatusTableEntry from '$lib/components/delegationStatusTable/Entry.svelte';
	import { client } from '$lib/api/rumbleClient/client';
	import { m } from '$lib/paraglide/messages';
	import formatNames from '$lib/helpers/formatNames';

	/** The supervisors of one registration: a delegation membership or a single participant. */
	type Props = { conferenceId: string } & (
		| { delegationMemberId: string; singleParticipantId?: never }
		| { singleParticipantId: string; delegationMemberId?: never }
	);

	let { conferenceId, delegationMemberId, singleParticipantId }: Props = $props();

	const supervisorSelection = {
		id: true,
		user: { givenName: true, familyName: true, pronouns: true, email: true }
	} as const;

	// The record and its supervisors in two steps: reading a field of a live result inside the
	// `$derived` that queried it would make every live update issue the query again.
	const registration = $derived(
		delegationMemberId
			? await client.liveQuery.delegationMember({
					__args: { id: delegationMemberId },
					supervisors: supervisorSelection
				})
			: singleParticipantId
				? await client.liveQuery.singleParticipant({
						__args: { id: singleParticipantId },
						supervisors: supervisorSelection
					})
				: undefined
	);
	const supervisors = $derived(registration?.supervisors ?? []);
</script>

<DashboardSection
	icon="chalkboard-user"
	title={m.supervisors()}
	description={m.supervisorsDescription()}
>
	{#if supervisors.length > 0}
		<DelegationStatusTableWrapper withEmail>
			{#each supervisors as supervisor (supervisor.id)}
				<DelegationStatusTableEntry
					name={formatNames(supervisor.user.givenName, supervisor.user.familyName)}
					pronouns={supervisor.user.pronouns}
					email={supervisor.user.email}
				/>
			{/each}
		</DelegationStatusTableWrapper>
	{/if}

	<a
		class="btn btn-primary mt-4 self-start"
		href={resolve(`/dashboard/${conferenceId}/connectSupervisor`)}
	>
		<i class="fas fa-plus mr-2"></i>
		{m.connectSupervisor()}
	</a>
</DashboardSection>
