<!--
	@component
	"Write to delegate": opens the chat between a participant and a team inbox the caller answers,
	from wherever the team meets that person (a paper, a table row). The inboxes reaching the person
	are asked for on the click: with one the chat opens right away, with several the caller picks
	which to write from. A paper passed along is attached to the first message.
-->
<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { toast } from 'svelte-sonner';
	import { client } from '#lib/api/rumbleClient/client';
	import { conflictMessageOf } from '#lib/api/errorCodes';
	import type { ChatInboxRow } from '#lib/api/chats';
	import { m } from '#lib/paraglide/messages';
	import Modal from '#lib/components/Modal.svelte';
	import InboxChoices from './InboxChoices.svelte';

	interface Props {
		conferenceId: string;
		/** The person's `conferenceParticipant` id */
		participantId: string;
		paperId?: string;
		/** Only the icon, for a table row */
		compact?: boolean;
	}

	let { conferenceId, participantId, paperId, compact = false }: Props = $props();

	let busy = $state(false);
	let choices = $state<ChatInboxRow[]>([]);
	let choosing = $state(false);

	async function openWith(option: Pick<ChatInboxRow, 'inbox' | 'committeeId'>) {
		const chat = await client.mutate.openTeamChat({
			__args: {
				conferenceId,
				inbox: option.inbox,
				committeeId: option.committeeId,
				participantId
			},
			id: true
		});
		choosing = false;
		const target = resolve(`dashboard/${conferenceId}/team/messages`);
		const query = new URLSearchParams({ chat: chat.id, ...(paperId ? { paper: paperId } : {}) });
		// eslint-disable-next-line svelte/no-navigation-without-resolve -- `target` is resolved above; only the query is added
		await goto(`${target}?${query.toString()}`);
	}

	async function start() {
		if (busy) return;
		busy = true;
		try {
			const reaching = await client.query.chatInboxes({
				__args: { conferenceId, participantId },
				inbox: true,
				committeeId: true,
				committeeAbbreviation: true,
				committeeName: true,
				chatId: true
			});
			const [only] = reaching;
			if (reaching.length === 0) toast.error(m.chatNoInboxReaches());
			else if (reaching.length === 1 && only) await openWith(only);
			else {
				choices = [...reaching];
				choosing = true;
			}
		} catch (error) {
			toast.error(conflictMessageOf(error) ?? m.chatCouldNotBeOpened());
		} finally {
			busy = false;
		}
	}

	async function choose(option: ChatInboxRow) {
		try {
			await openWith(option);
		} catch (error) {
			toast.error(conflictMessageOf(error) ?? m.chatCouldNotBeOpened());
		}
	}
</script>

{#if compact}
	<button
		type="button"
		class="btn btn-ghost btn-xs btn-square"
		title={m.chatWriteToDelegate()}
		aria-label={m.chatWriteToDelegate()}
		disabled={busy}
		onclick={(event) => {
			event.stopPropagation();
			void start();
		}}
		data-testid="write-to-delegate"
	>
		<i aria-hidden="true" class="ph-duotone ph-chat-circle-dots text-base"></i>
	</button>
{:else}
	<button
		type="button"
		class="btn btn-sm"
		disabled={busy}
		onclick={start}
		data-testid="write-to-delegate"
	>
		<i aria-hidden="true" class="ph-duotone ph-chat-circle-dots"></i>
		{m.chatWriteToDelegate()}
	</button>
{/if}

<Modal bind:open={choosing} title={m.chatWriteToDelegate()}>
	<p class="text-base-content/70 mb-3 text-sm">{m.chatChooseInbox()}</p>
	<InboxChoices options={choices} onChoose={choose} />
	{#snippet action()}
		<button class="btn btn-ghost" onclick={() => (choosing = false)}>{m.cancel()}</button>
	{/snippet}
</Modal>
