<script lang="ts">
	import DelegationApplication from '../sections/DelegationApplication.svelte';
	import SingleApplication from '../sections/SingleApplication.svelte';
	import SupervisorRegistration from '../sections/SupervisorRegistration.svelte';
	import ApplicationReview from '../sections/ApplicationReview.svelte';
	import WaitingListSection from '../sections/WaitingListSection.svelte';

	/**
	 * How the person came in, whatever kind of registration it was: the application and what the
	 * team made of it, and their waiting list entry, first while they still wait for a seat.
	 */
	interface Props {
		userId: string;
		conferenceId: string;
		delegationId: string | undefined;
		singleParticipantId: string | undefined;
		supervisorId: string | undefined;
		/** On the waiting list and not seated from it yet */
		waiting: boolean;
	}

	let { userId, conferenceId, delegationId, singleParticipantId, supervisorId, waiting }: Props =
		$props();
</script>

<div class="flex flex-col gap-6">
	{#if waiting}
		<WaitingListSection {userId} {conferenceId} />
	{/if}
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

	{#if !waiting}
		<WaitingListSection {userId} {conferenceId} />
	{/if}
</div>
