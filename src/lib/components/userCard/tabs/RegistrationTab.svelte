<script lang="ts">
	import type { TeamroleEnum } from '#lib/api/rumbleClient/client';
	import DelegationApplication from '../sections/DelegationApplication.svelte';
	import SingleApplication from '../sections/SingleApplication.svelte';
	import SupervisorRegistration from '../sections/SupervisorRegistration.svelte';
	import ApplicationReview from '../sections/ApplicationReview.svelte';
	import SeatSection from '../sections/SeatSection.svelte';
	import WaitingListSection from '../sections/WaitingListSection.svelte';

	/**
	 * What the person holds in the conference and how they came in, whatever kind of registration it
	 * was: the seat beside the application and what the team made of it, and their waiting list
	 * entry, first while they still wait for a seat.
	 */
	interface Props {
		userId: string;
		conferenceId: string;
		delegationId: string | undefined;
		singleParticipantId: string | undefined;
		supervisorId: string | undefined;
		teamRole: TeamroleEnum | null | undefined;
		/** On the waiting list and not seated from it yet */
		waiting: boolean;
	}

	let {
		userId,
		conferenceId,
		delegationId,
		singleParticipantId,
		supervisorId,
		teamRole,
		waiting
	}: Props = $props();

	const holdsPart = $derived(
		!!delegationId || !!singleParticipantId || !!supervisorId || teamRole !== undefined
	);
</script>

<div class="flex flex-col gap-6">
	{#if waiting}
		<WaitingListSection {userId} {conferenceId} />
	{/if}
	<div
		class="grid grid-cols-1 items-start gap-6 {delegationId || singleParticipantId
			? 'xl:grid-cols-2'
			: ''}"
	>
		{#if holdsPart}
			<div class="min-w-0">
				<SeatSection
					{userId}
					{conferenceId}
					{delegationId}
					{singleParticipantId}
					{supervisorId}
					{teamRole}
				/>
			</div>
		{/if}
		<div class="flex min-w-0 flex-col gap-6">
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
		</div>
	</div>

	{#if !waiting}
		<WaitingListSection {userId} {conferenceId} />
	{/if}
</div>
