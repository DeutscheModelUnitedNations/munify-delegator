<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import { client } from '#lib/api/rumbleClient/client';
	import Empty from '../ui/Empty.svelte';
	import Section from '../ui/Section.svelte';

	/** The custom role a single participant holds. */
	interface Props {
		singleParticipantId: string;
	}

	let { singleParticipantId }: Props = $props();

	const participant = $derived(
		await client.liveQuery.singleParticipant({
			__args: { id: singleParticipantId },
			id: true,
			assignedRole: { id: true, name: true, icon: true }
		})
	);
</script>

<Section
	icon={participant.assignedRole?.icon ?? 'user'}
	title={participant.assignedRole?.name ?? m.singleParticipant()}
	subtitle={participant.assignedRole ? m.singleParticipant() : undefined}
>
	{#if !participant.assignedRole}
		<Empty icon="hourglass-medium" text={m.noAssignment()} />
	{/if}
</Section>
