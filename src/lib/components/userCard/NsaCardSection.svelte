<script lang="ts">
	import { errorToastMessage } from '#lib/utils/toast';
	import Row from './ui/Row.svelte';
	import { m } from '#lib/paraglide/messages';
	import { toast } from 'svelte-sonner';
	import { client } from '#lib/api/rumbleClient/client';
	import { downloadNsaCard } from '#lib/api/nsaCards';

	/** The printed NSA card of someone representing a non-state actor; nothing for anybody else. */
	interface Props {
		userId: string;
		conferenceId: string;
	}

	let { userId, conferenceId }: Props = $props();

	const participants = $derived(
		await client.liveQuery.conferenceParticipants({
			__args: {
				where: {
					conferenceId: { eq: conferenceId },
					userId: { eq: userId },
					delegationMember: { delegation: { assignedRole: { kind: 'NON_STATE_ACTOR' } } }
				}
			},
			id: true,
			nsaCardNumber: true
		})
	);
	const participant = $derived(participants.at(0));

	let busy = $state(false);
	let confirmingReprint = $state(false);

	async function print({ id, reprint }: { id: string; reprint: boolean }) {
		if (busy) return;
		busy = true;
		const promise = downloadNsaCard({ conferenceId, conferenceParticipantId: id, reprint });
		toast.promise(promise, {
			loading: m.genericToastLoading(),
			success: m.genericToastSuccess(),
			error: errorToastMessage
		});
		await promise.catch(() => undefined);
		busy = false;
		confirmingReprint = false;
	}
</script>

{#if participant}
	{@const id = participant.id}
	<Row icon="cards" title={m.nsaCard()}>
		{m.nsaCardNumberLabel({ number: participant.nsaCardNumber })}
		{#snippet actions()}
			<div class="flex flex-wrap items-center gap-2">
				<button
					class="btn btn-sm btn-ghost text-primary"
					disabled={busy}
					onclick={() => print({ id, reprint: false })}
				>
					<i aria-hidden="true" class="ph-duotone ph-printer"></i>
					{m.nsaCardPrint()}
				</button>
				{#if confirmingReprint}
					<button
						class="btn btn-sm btn-warning"
						disabled={busy}
						onclick={() => print({ id, reprint: true })}
					>
						{m.nsaCardReprintConfirm()}
					</button>
					<button
						class="btn btn-sm btn-ghost text-primary"
						onclick={() => (confirmingReprint = false)}
					>
						{m.cancel()}
					</button>
				{:else}
					<button
						class="btn btn-sm btn-ghost text-primary"
						disabled={busy}
						title={m.nsaCardReprintHint()}
						onclick={() => (confirmingReprint = true)}
					>
						<i aria-hidden="true" class="ph-duotone ph-arrows-clockwise"></i>
						{m.nsaCardReprint()}
					</button>
				{/if}
			</div>
		{/snippet}
	</Row>
{/if}
