<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import CopyValue from '../CopyValue.svelte';
	import Fact from '../Fact.svelte';
	import { fetchParticipantStatus } from '../tabs/participantStatus';

	/** The number of the person's access card. */
	interface Props {
		userId: string;
		conferenceId: string;
	}

	let { userId, conferenceId }: Props = $props();

	const statuses = $derived(await fetchParticipantStatus({ userId, conferenceId }));
	const accessCardId = $derived(statuses.at(0)?.accessCardId);
</script>

<Fact label={m.userCardAccessCard()} icon="identification-card" class="col-span-2">
	{#if accessCardId}
		<CopyValue value={accessCardId} label={m.userCardAccessCard()} mono />
	{:else}
		<span class="text-base-content/60">–</span>
		<span class="sr-only">{m.noAccessCard()}</span>
	{/if}
</Fact>
