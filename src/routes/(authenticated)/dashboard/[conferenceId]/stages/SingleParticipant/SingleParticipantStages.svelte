<script lang="ts">
	import type { MyConferenceParticipation } from '#lib/api/myConferenceParticipation';
	import type { CurrentUser } from '#lib/state/currentUser.svelte.js';
	import ParticipantStages from '../Common/ParticipantStages.svelte';
	import SingleParticipantPreparationStage from './SingleParticipantPreparationStage.svelte';
	import SingleParticipantRegistrationStage from './SingleParticipantRegistrationStage.svelte';

	/** A single participant's dashboard through the phases of the conference. */
	interface Props {
		conferenceId: string;
		conference: NonNullable<MyConferenceParticipation['conference']>;
		singleParticipant: NonNullable<MyConferenceParticipation['singleParticipant']>;
		user: CurrentUser;
		status: MyConferenceParticipation['participantStatus'] | null;
		ofAge: boolean;
		/** Whether the application deadline has passed and the team is selecting. */
		selectionInProgress: boolean;
	}

	let {
		conferenceId,
		conference,
		singleParticipant,
		user,
		status,
		ofAge,
		selectionInProgress
	}: Props = $props();

	const singleParticipantId = $derived(singleParticipant.id);
</script>

<ParticipantStages
	{conferenceId}
	conferenceState={conference.state}
	userId={user.sub}
	assignmentReleased={conference.assignmentReleased}
	{selectionInProgress}
	application={{
		participantType: 'singleParticipant',
		applied: singleParticipant.applied,
		supportId: singleParticipant.id
	}}
	accepted={!!singleParticipant.assignedRole}
	{status}
	{ofAge}
	certificateRole={{ customConferenceRole: singleParticipant.assignedRole }}
>
	{#snippet registration()}
		<SingleParticipantRegistrationStage {conferenceId} {singleParticipantId} />
	{/snippet}
	{#snippet preparation()}
		<SingleParticipantPreparationStage {conferenceId} {singleParticipant} />
	{/snippet}
</ParticipantStages>
