<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import { client } from '#lib/api/rumbleClient/client.js';
	import Flag from '#lib/components/Flag.svelte';
	import NoAssignmentNotice from '../NoAssignmentNotice.svelte';

	/** The custom role a single participant holds, and what the team noted about the assignment. */
	interface Props {
		singleParticipantId: string;
	}

	let { singleParticipantId }: Props = $props();

	const participant = $derived(
		await client.liveQuery.singleParticipant({
			__args: { id: singleParticipantId },
			id: true,
			applied: true,
			assignmentDetails: true,
			assignedRole: { id: true, name: true, fontAwesomeIcon: true }
		})
	);
</script>

<section class="flex flex-col gap-4">
	<h3 class="text-lg font-bold">{m.singleParticipant()}</h3>
	<div class="bg-base-200 rounded-box p-4">
		<div class="flex items-center gap-3">
			{#if participant.assignedRole}
				<Flag nsa icon={participant.assignedRole.fontAwesomeIcon ?? 'fa-hand-point-up'} size="xs" />
				<span class="text-lg font-bold">{participant.assignedRole.name}</span>
			{:else}
				<NoAssignmentNotice applied={participant.applied} />
			{/if}
		</div>
		{#if participant.assignmentDetails}
			<p class="mt-3 text-sm whitespace-pre-line">
				<span class="text-base-content/60">{m.userCardAssignmentDetails()}:</span>
				{participant.assignmentDetails}
			</p>
		{/if}
	</div>
</section>
