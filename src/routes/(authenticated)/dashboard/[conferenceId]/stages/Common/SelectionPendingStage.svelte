<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import SelectionInProgressNotice from './SelectionInProgressNotice.svelte';

	/** A participant's dashboard between the application deadline and the end of registration. */
	interface Props {
		participantType: 'delegation' | 'singleParticipant';
		/** Whether the application was sent in time, and so takes part in the selection. */
		applied: boolean;
		/** The delegation's or single participant's id, for support requests. */
		supportId: string;
	}

	let { participantType, applied, supportId }: Props = $props();
</script>

<SelectionInProgressNotice />

{#if applied}
	<section role="alert" class="alert alert-success w-full">
		<i class="fa-sharp-duotone fa-solid fa-circle-check text-3xl"></i>
		<div class="flex flex-col">
			<p class="font-bold">{m.applicationCompletedTitle()}</p>
			<p class="mt-2">
				{participantType === 'delegation'
					? m.applicationCompletedDelegationText()
					: m.applicationCompletedSingleParticipantText()}
			</p>
		</div>
	</section>
{:else}
	<section role="alert" class="alert alert-warning w-full">
		<i class="fa-sharp-duotone fa-solid fa-exclamation-triangle text-3xl"></i>
		<div class="flex flex-col">
			<p class="font-bold">{m.applicationNotCompletedTitle()}</p>
			<p class="mt-2">
				{participantType === 'delegation'
					? m.applicationNotCompletedDelegationText()
					: m.applicationNotCompletedSingleParticipantText()}
			</p>
		</div>
	</section>
{/if}

<p class="text-xs">
	{participantType === 'delegation'
		? m.delegationIdForSupport()
		: m.singleParticipantsIdForSupport()}
	<span class="bg-base-200 rounded-sm p-1 font-mono">{supportId}</span>
</p>
