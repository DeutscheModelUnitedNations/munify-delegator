<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import SelectionInProgressNotice from './SelectionInProgressNotice.svelte';

	interface Props {
		participantType: 'delegation' | 'singleParticipant';
		applied: boolean;
		supportId: string;
	}

	let { participantType, applied, supportId }: Props = $props();
</script>

<SelectionInProgressNotice />

{#if applied}
	<section role="alert" class="alert alert-success w-full">
		<i class="fas fa-circle-check text-3xl"></i>
		<div class="flex flex-col">
			<p class="font-bold">{m.applicationCompletedTitle()}</p>
			<p class="mt-2">
				{#if participantType === 'delegation'}
					{m.applicationCompletedDelegationText()}
				{:else}
					{m.applicationCompletedSingleParticipantText()}
				{/if}
			</p>
		</div>
	</section>
{:else}
	<section role="alert" class="alert alert-warning w-full">
		<i class="fas fa-exclamation-triangle text-3xl"></i>
		<div class="flex flex-col">
			<p class="font-bold">{m.applicationNotCompletedTitle()}</p>
			<p class="mt-2">
				{#if participantType === 'delegation'}
					{m.applicationNotCompletedDelegationText()}
				{:else}
					{m.applicationNotCompletedSingleParticipantText()}
				{/if}
			</p>
		</div>
	</section>
{/if}

<p class="text-xs">
	{#if participantType === 'delegation'}
		{@html m.delegationIdForSupport()}
	{:else}
		{@html m.singleParticipantsIdForSupport()}
	{/if}
	<span class="bg-base-200 rounded-sm p-1 font-mono">{supportId}</span>
</p>
