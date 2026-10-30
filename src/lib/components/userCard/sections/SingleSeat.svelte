<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import { client } from '#lib/api/rumbleClient/client';
	import Flag from '#lib/components/Flag.svelte';
	import NoAssignmentNotice from '../NoAssignmentNotice.svelte';

	/** The custom role a single participant holds. */
	interface Props {
		singleParticipantId: string;
	}

	let { singleParticipantId }: Props = $props();

	const participant = $derived(
		await client.liveQuery.singleParticipant({
			__args: { id: singleParticipantId },
			id: true,
			applied: true,
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
	</div>
</section>
