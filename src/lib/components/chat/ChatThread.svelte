<!--
	@component
	One open chat: who it is with, its messages by day, and the field to write in. Fetches the chat
	and its messages itself and marks them read while it is on screen. Participants see each other
	by role; a message from a team inbox carries the name of who wrote it.
-->
<script lang="ts">
	import { tick } from 'svelte';
	import { client } from '#lib/api/rumbleClient/client';
	import { fetchChat, fetchChatMessages, type OpenChat } from '#lib/api/chats';
	import { liveSnapshot } from '#lib/api/liveSnapshot';
	import { m } from '#lib/paraglide/messages';
	import ChatComposer from './ChatComposer.svelte';
	import ChatMessages from './ChatMessages.svelte';
	import ChatReviewBanner from './ChatReviewBanner.svelte';
	import ChatThreadHeader from './ChatThreadHeader.svelte';
	import { chatTitle, sideOf } from './chatLabels';
	import { unreadStateOf } from './threadMessages';

	interface Props {
		chatId: string;
		/** On a phone the thread fills the page; this leads back to the list */
		onBack?: () => void;
		/** A paper the next message is about (the team writing from a paper) */
		paperId?: string | null;
		onPaperSent?: () => void;
	}

	let { chatId, onBack, paperId = null, onPaperSent }: Props = $props();

	const PAGE = 50;
	let limit = $state(PAGE);

	const [liveChat, liveMessages] = $derived(
		await Promise.all([fetchChat(chatId), fetchChatMessages({ chatId, limit })])
	);

	// read through the live list, so the thread follows what happens to the chat (a block, a
	// suspension, messaging being switched off)
	const chatSnapshot = liveSnapshot<OpenChat>();
	const chat = $derived(chatSnapshot(liveChat).at(0) ?? null);

	const snapshot = liveSnapshot<(typeof liveMessages)[number]>();
	// asked for newest first, so a limit keeps the latest; shown oldest first
	const messages = $derived([...snapshot(liveMessages)].reverse());
	const hasEarlier = $derived(messages.length >= limit);
	const newestId = $derived(messages.at(-1)?.id ?? '');

	const side = $derived(chat ? sideOf(chat) : 'REVIEW');
	let scroller = $state<HTMLDivElement>();

	// Follows the conversation: down to the newest message whenever one arrives or the chat changes.
	let seenNewest = '';
	$effect(() => {
		const newest = `${chatId}:${newestId}`;
		if (newest === seenNewest || !scroller) return;
		seenNewest = newest;
		void tick().then(() => {
			if (scroller) scroller.scrollTop = scroller.scrollHeight;
		});
	});

	// Reading is marked once per unread state, while the page is in front.
	let markedFor = '';
	$effect(() => {
		const state = unreadStateOf({ chat, side, newestId });
		if (!state || state === markedFor || document.visibilityState !== 'visible') return;
		markedFor = state;
		void Promise.resolve(client.mutate.markChatRead({ __args: { chatId } })).catch(
			() => (markedFor = '')
		);
	});
</script>

{#if !chat}
	<div class="text-base-content/60 flex h-full flex-col items-center justify-center gap-2 p-8">
		<i aria-hidden="true" class="ph-duotone ph-chat-slash text-4xl"></i>
		<p>{m.chatNotFound()}</p>
	</div>
{:else}
	<section
		class="flex h-full min-h-0 flex-col"
		aria-label={chatTitle(chat)}
		data-testid="chat-thread"
	>
		<ChatThreadHeader {chat} {side} {onBack} />

		{#if side === 'REVIEW'}
			<ChatReviewBanner contacts={chat.contacts} people={chat.people} />
		{/if}

		<div
			bind:this={scroller}
			class="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 py-4 sm:px-5"
		>
			{#if hasEarlier}
				<button
					type="button"
					class="btn btn-ghost btn-sm self-center"
					onclick={() => (limit += PAGE)}
				>
					<i aria-hidden="true" class="ph-duotone ph-clock-counter-clockwise"></i>
					{m.chatLoadEarlier()}
				</button>
			{/if}
			{#if messages.length === 0}
				<div
					class="text-base-content/60 m-auto flex max-w-sm flex-col items-center gap-2 text-center"
				>
					<i aria-hidden="true" class="ph-duotone ph-chats-circle text-4xl"></i>
					<p>{m.chatEmptyThread()}</p>
				</div>
			{/if}
			<ChatMessages {messages} {chat} {side} conferenceId={chat.conferenceId} />
		</div>

		<ChatComposer chatId={chat.id} refusal={chat.writeRefusal ?? null} {paperId} {onPaperSent} />
	</section>
{/if}
