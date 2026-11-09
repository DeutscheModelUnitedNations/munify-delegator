<script lang="ts">
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
			error: (error) => (error instanceof Error ? error.message : m.genericToastError())
		});
		await promise.catch(() => undefined);
		busy = false;
		confirmingReprint = false;
	}
</script>

{#if participant}
	{@const id = participant.id}
	<div class="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
		<i
			aria-hidden="true"
			class="ph-duotone ph-identification-card text-base-content/60 w-6 text-center text-lg"
		></i>
		<div class="flex min-w-48 grow flex-col">
			<span class="font-semibold">{m.nsaCard()}</span>
			<span class="text-base-content/60 text-sm">
				{m.nsaCardNumberLabel({ number: participant.nsaCardNumber })}
			</span>
		</div>
		<div class="flex flex-wrap items-center gap-2">
			<button class="btn btn-sm" disabled={busy} onclick={() => print({ id, reprint: false })}>
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
				<button class="btn btn-sm btn-ghost" onclick={() => (confirmingReprint = false)}>
					{m.cancel()}
				</button>
			{:else}
				<button
					class="btn btn-sm"
					disabled={busy}
					title={m.nsaCardReprintHint()}
					onclick={() => (confirmingReprint = true)}
				>
					<i aria-hidden="true" class="ph-duotone ph-arrows-clockwise"></i>
					{m.nsaCardReprint()}
				</button>
			{/if}
		</div>
	</div>
{/if}
