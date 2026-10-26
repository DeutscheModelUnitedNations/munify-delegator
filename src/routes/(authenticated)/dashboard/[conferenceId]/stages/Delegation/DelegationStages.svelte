<script lang="ts">
	import type { MyConferenceParticipation } from '#lib/api/myConferenceParticipation.js';
	import { splitRole } from '#lib/helpers/conferenceRole.js';
	import type { CurrentUser } from '#lib/state/currentUser.svelte.js';
	import ParticipantStages from '../Common/ParticipantStages.svelte';
	import DelegationPreparationStage from './DelegationPreparationStage.svelte';
	import DelegationRegistrationStage from './DelegationRegistrationStage.svelte';

	/** A delegation member's dashboard through the phases of the conference. */
	interface Props {
		conferenceId: string;
		conference: NonNullable<MyConferenceParticipation['conference']>;
		delegationMember: NonNullable<MyConferenceParticipation['delegationMember']>;
		user: CurrentUser;
		status: MyConferenceParticipation['participantStatus'] | null;
		ofAge: boolean;
	}

	let { conferenceId, conference, delegationMember, user, status, ofAge }: Props = $props();

	const delegationMemberId = $derived(delegationMember.id);
	const delegationRole = $derived(splitRole(delegationMember.delegation.assignedRole));
</script>

<ParticipantStages
	{conferenceId}
	conferenceState={conference.state}
	userId={user.sub}
	assignmentReleased={conference.assignmentReleased}
	accepted={!!delegationMember.delegation.assignedRole}
	{status}
	{ofAge}
	certificateRole={{
		country: delegationRole.nation,
		nonStateActor: delegationRole.nonStateActor,
		assignedCommittee: delegationMember.assignedCommittee
	}}
>
	{#snippet registration()}
		<DelegationRegistrationStage {conferenceId} {delegationMemberId} />
	{/snippet}
	{#snippet preparation()}
		<DelegationPreparationStage
			{conferenceId}
			{delegationMember}
			{user}
			{status}
			ofAgeAtConference={ofAge}
		/>
	{/snippet}
</ParticipantStages>
