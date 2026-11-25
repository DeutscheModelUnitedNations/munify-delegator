<script lang="ts">
	import { client } from '#lib/api/rumbleClient/client';
	import { m } from '#lib/paraglide/messages';
	import QuotedText from '../QuotedText.svelte';

	/** What an application says in its own words, the two beside each other where a `Section` has three columns. */
	interface Props {
		delegationId?: string;
		singleParticipantId?: string;
	}

	let { delegationId, singleParticipantId }: Props = $props();

	const selection = { motivation: true, experience: true } as const;

	async function fetchTexts({ delegationId, singleParticipantId }: Props) {
		if (delegationId !== undefined)
			return client.liveQuery.delegation({ __args: { id: delegationId }, ...selection });
		if (singleParticipantId !== undefined)
			return client.liveQuery.singleParticipant({
				__args: { id: singleParticipantId },
				...selection
			});
		return undefined;
	}

	const texts = $derived(await fetchTexts({ delegationId, singleParticipantId }));
</script>

{#if texts?.motivation || texts?.experience}
	<div
		class="grid min-w-0 grid-cols-[repeat(auto-fill,minmax(min(100%,24rem),1fr))] gap-x-12 group-data-wide/card:min-[1760px]:col-span-2"
	>
		{#if texts.motivation}
			<QuotedText icon="chat-centered-text" title={m.motivation()} text={texts.motivation} />
		{/if}
		{#if texts.experience}
			<QuotedText icon="trophy" title={m.experience()} text={texts.experience} />
		{/if}
	</div>
{/if}
