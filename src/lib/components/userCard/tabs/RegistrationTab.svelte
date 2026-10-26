<script lang="ts">
	import DelegationApplication from '../sections/DelegationApplication.svelte';
	import SingleApplication from '../sections/SingleApplication.svelte';
	import SupervisorRegistration from '../sections/SupervisorRegistration.svelte';
	import ApplicationReview from '../sections/ApplicationReview.svelte';
	import WaitingListSection from '../sections/WaitingListSection.svelte';
	import ParticipantSchoolSection from '../ParticipantSchoolSection.svelte';

	/**
	 * How the person came in, whatever kind of registration it was: the application and what the
	 * team made of it, their waiting list entry, and their own school.
	 */
	interface Props {
		userId: string;
		conferenceId: string;
		delegationId: string | undefined;
		singleParticipantId: string | undefined;
		supervisorId: string | undefined;
	}

	let { userId, conferenceId, delegationId, singleParticipantId, supervisorId }: Props = $props();
</script>

<div class="flex flex-col gap-6">
	{#if delegationId}
		<DelegationApplication {delegationId} {conferenceId} />
		<ApplicationReview {conferenceId} applicationId={delegationId} kind="delegation" />
	{:else if singleParticipantId}
		<SingleApplication {singleParticipantId} {conferenceId} />
		<ApplicationReview
			{conferenceId}
			applicationId={singleParticipantId}
			kind="singleParticipant"
		/>
	{/if}
	{#if supervisorId}
		<SupervisorRegistration {supervisorId} />
	{/if}

	<WaitingListSection {userId} {conferenceId} />

	<ParticipantSchoolSection {userId} {conferenceId} />
</div>
