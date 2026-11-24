<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import Fact from '../Fact.svelte';
	import { fetchParticipantStatus } from '../tabs/participantStatus';

	/** The number of the person's access card, once they have one. */
	interface Props {
		userId: string;
		conferenceId: string;
	}

	let { userId, conferenceId }: Props = $props();

	const statuses = $derived(await fetchParticipantStatus({ userId, conferenceId }));
	const accessCardId = $derived(statuses.at(0)?.accessCardId);
</script>

{#if accessCardId}
	<Fact label={m.accessCardId()} value={accessCardId} mono />
{/if}
