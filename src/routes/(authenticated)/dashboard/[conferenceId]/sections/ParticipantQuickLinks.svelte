<script lang="ts">
	import { client } from '#lib/api/rumbleClient/client.js';
	import type { MyConferenceParticipation } from '#lib/api/myConferenceParticipation.js';
	import type { CurrentUser } from '#lib/state/currentUser.svelte.js';
	import { splitRole } from '#lib/helpers/conferenceRole.js';
	import DashboardQuickLinks from './DashboardQuickLinks.svelte';

	/**
	 * The quick links at the top of the dashboard, for whoever has a part to prepare: an accepted
	 * delegation member or single participant, or a supervisor with at least one accepted student,
	 * once the assignment is released and while the conference is being prepared or running.
	 */
	interface Props {
		conferenceId: string;
		conference: NonNullable<MyConferenceParticipation['conference']>;
		singleParticipant: MyConferenceParticipation['singleParticipant'] | undefined;
		delegationMember: MyConferenceParticipation['delegationMember'] | undefined;
		supervisorId: string | undefined;
		user: CurrentUser;
		status: MyConferenceParticipation['participantStatus'] | null;
		ofAge: boolean;
	}

	let {
		conferenceId,
		conference,
		singleParticipant,
		delegationMember,
		supervisorId,
		user,
		status,
		ofAge
	}: Props = $props();

	const preparing = $derived(
		conference.assignmentReleased &&
			(conference.state === 'PREPARATION' || conference.state === 'ACTIVE')
	);
	const delegationId = $derived(
		delegationMember?.delegation.assignedRole ? delegationMember.delegation.id : undefined
	);
	const delegationRole = $derived(splitRole(delegationMember?.delegation.assignedRole));
</script>

{#if preparing}
	{#if singleParticipant}
		{#if singleParticipant.assignedRole}
			<DashboardQuickLinks
				{conferenceId}
				userType="singleParticipant"
				{user}
				{status}
				ofAgeAtConference={ofAge}
			/>
		{/if}
	{:else if delegationMember}
		{#if delegationId}
			{@const delegation = await client.liveQuery.delegation({
				__args: { id: delegationId },
				members: { assignedCommittee: { id: true } }
			})}
			<DashboardQuickLinks
				{conferenceId}
				userType="delegation"
				{user}
				{status}
				ofAgeAtConference={ofAge}
				extraContext={{
					isHeadDelegate: delegationMember.isHeadDelegate,
					hasNationAssigned: !!delegationRole.nation,
					membersLackCommittees: delegation.members.some((member) => !member.assignedCommittee)
				}}
			/>
		{/if}
	{:else if supervisorId}
		{@const supervisor = await client.liveQuery.conferenceSupervisor({
			__args: { id: supervisorId },
			supervisedDelegationMembers: { delegation: { assignedRole: { id: true } } },
			supervisedSingleParticipants: { assignedRole: { id: true } }
		})}
		{#if supervisor.supervisedDelegationMembers.some((x) => x.delegation.assignedRole) || supervisor.supervisedSingleParticipants.some((x) => x.assignedRole)}
			<DashboardQuickLinks
				{conferenceId}
				userType="supervisor"
				{user}
				{status}
				ofAgeAtConference={ofAge}
			/>
		{/if}
	{/if}
{/if}
