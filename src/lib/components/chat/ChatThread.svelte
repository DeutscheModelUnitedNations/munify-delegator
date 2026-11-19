<!--
	@component
	One open chat: who it is with, its messages by day, and the field to write in. Fetches the chat
	and its messages itself and marks them read while it is on screen. A line shows where the
	reader left off, and the chat opens there. Participants see each other
	by role; a message from a team inbox carries the name of who wrote it.
-->
<script lang="ts">
	import { tick, untrack } from 'svelte';
	import { prefersReducedMotion } from 'svelte/motion';
	import { fly } from 'svelte/transition';
	import { client } from '#lib/api/rumbleClient/client';
	import { fetchChat, fetchChatMessages, type OpenChat } from '#lib/api/chats';
	import { liveSnapshot } from '#lib/api/liveSnapshot';
	import { m } from '#lib/paraglide/messages';
	import ChatComposer from './ChatComposer.svelte';
	import ChatMessages from './ChatMessages.svelte';
	import ChatReviewBanner from './ChatReviewBanner.svelte';
	import ChatThreadHeader from './ChatThreadHeader.svelte';
	import { chatTitle, sideOf } from './chatLabels';
	import {
		firstUnreadId,
		followStep,
		scrollBehaviorFor,
		unreadStateOf,
		type ThreadReport
	} from './threadMessages';
	import { canHideIn } from './hiddenMessages';

	interface Props {
		chatId: string;
		/** On a phone the thread fills the page; this leads back to the list */
		onBack?: () => void;
		/** A paper the next message is about (the team writing from a paper) */
		paperId?: string | null;
		onPaperSent?: () => void;
		/** A reported chat participant care reads: its open reports, shown where they were filed */
		reports?: readonly ThreadReport[];
	}

	let { chatId, onBack, paperId = null, onPaperSent, reports = [] }: Props = $props();

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
	const newest = $derived(messages.at(-1));
	const newestId = $derived(newest?.id ?? '');

	const side = $derived(chat ? sideOf(chat) : 'REVIEW');
	let scroller = $state<HTMLDivElement>();
	/** Close enough to the end to follow new messages; scrolled further up, the reader stays put */
	let nearEnd = true;
	/** A message came in while the reader was further up */
	let missed = $state(false);
	const NEAR_END_PX = 120;

	function onScroll() {
		if (!scroller) return;
		nearEnd = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < NEAR_END_PX;
		if (nearEnd) missed = false;
	}

	// Where the reader left off, taken once as the chat opens (a thread is created per chat): the
	// line stays while the chat is open, although opening it marks everything read.
	const unreadFromId = untrack(() =>
		chat ? firstUnreadId({ messages, side, chat, unreadCount: chat.unreadCount }) : undefined
	);

	// Opens at the first unread message, or at the end; then follows the conversation down to each
	// new message, as long as the reader is near the end or wrote it themselves. Otherwise a button
	// offers the way down, as messengers do.
	let seenNewest = '';
	$effect(() => {
		const key = `${chatId}:${newestId}`;
		if (!scroller) return;
		const step = followStep({ key, seenKey: seenNewest, nearEnd, newest, side, chat });
		if (step === 'stay') return;
		seenNewest = key;
		if (step === 'flag') missed = true;
		else void tick().then(() => scrollTo(step === 'open'));
	});

	/** Where the unread divider sits in the thread, if it is there. */
	function dividerTop(thread: HTMLDivElement) {
		const divider = thread.querySelector('[data-unread-divider]');
		if (!divider) return null;
		return (
			thread.scrollTop +
			divider.getBoundingClientRect().top -
			thread.getBoundingClientRect().top -
			12
		);
	}

	function scrollTo(opening: boolean) {
		if (!scroller) return;
		// only the thread scrolls: `scrollIntoView` would move the page along
		const top = (opening ? dividerTop(scroller) : null) ?? scroller.scrollHeight;
		scroller.scrollTo({
			top,
			behavior: scrollBehaviorFor({ opening, reducedMotion: prefersReducedMotion.current })
		});
		missed = false;
	}

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
			<ChatReviewBanner />
		{/if}

		<div
			bind:this={scroller}
			class="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 py-4 sm:px-5"
			onscroll={onScroll}
		>
			<!-- long lines are hard to read: on a wide screen the messages keep to a column -->
			<div class="mx-auto flex w-full max-w-4xl flex-1 flex-col">
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
				<ChatMessages
					{messages}
					{chat}
					{side}
					{unreadFromId}
					{reports}
					conferenceId={chat.conferenceId}
					canHide={canHideIn({ side, kind: chat.kind })}
				/>
			</div>
			{#if missed}
				<button
					type="button"
					class="btn btn-primary btn-sm sticky bottom-0 mt-2 gap-2 self-center shadow-lg"
					onclick={() => scrollTo(false)}
					transition:fly={{ y: 12, duration: prefersReducedMotion.current ? 0 : 180 }}
					data-testid="chat-jump-newest"
				>
					<i aria-hidden="true" class="ph-duotone ph-arrow-down"></i>
					{m.chatJumpToNewest()}
				</button>
			{/if}
		</div>

		<ChatComposer chatId={chat.id} refusal={chat.writeRefusal ?? null} {paperId} {onPaperSent} />
	</section>
{/if}
