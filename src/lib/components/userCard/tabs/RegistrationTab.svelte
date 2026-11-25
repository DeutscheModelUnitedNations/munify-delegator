<script lang="ts">
	import DelegationApplication from '../sections/DelegationApplication.svelte';
	import DelegationSeat from '../sections/DelegationSeat.svelte';
	import SingleApplication from '../sections/SingleApplication.svelte';
	import SingleSeat from '../sections/SingleSeat.svelte';
	import SupervisorSeat from '../sections/SupervisorSeat.svelte';
	import WaitingListSection from '../sections/WaitingListSection.svelte';

	/**
	 * What the person holds in the conference and how they came in, whatever kind of registration it
	 * was: the application above the seat while people apply and below it afterwards, and their waiting
	 * list entry, first while they still wait for a seat.
	 */
	interface Props {
		userId: string;
		conferenceId: string;
		delegationId: string | undefined;
		singleParticipantId: string | undefined;
		supervisorId: string | undefined;
		/** On the waiting list and not seated from it yet */
		waiting: boolean;
		/** The conference is still in the time of applications */
		applying: boolean;
	}

	let {
		userId,
		conferenceId,
		delegationId,
		singleParticipantId,
		supervisorId,
		waiting,
		applying
	}: Props = $props();
</script>

{#snippet seat()}
	{#if delegationId}
		<DelegationSeat {delegationId} {conferenceId} {userId} />
	{:else if singleParticipantId}
		<SingleSeat {singleParticipantId} />
	{/if}
{/snippet}

{#snippet application()}
	{#if delegationId}
		<DelegationApplication {delegationId} {conferenceId} />
	{:else if singleParticipantId}
		<SingleApplication {singleParticipantId} {conferenceId} />
	{/if}
{/snippet}

<div class="flex flex-col gap-6">
	{#if waiting}
		<WaitingListSection {userId} {conferenceId} />
	{/if}

	{#if applying}
		{@render application()}
		{@render seat()}
	{:else}
		{@render seat()}
		{@render application()}
	{/if}

	{#if supervisorId}
		<SupervisorSeat {supervisorId} />
	{/if}

	{#if !waiting}
		<WaitingListSection {userId} {conferenceId} />
	{/if}
</div>
