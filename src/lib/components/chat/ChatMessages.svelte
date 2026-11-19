<!--
	@component
	The messages of a thread, by day: the caller's side on the right, the other on the left, with
	the author's line where a side has more than one voice (`threadMessages.ts`), a line above the
	first message the reader had not read yet and, for participant care, one where the chat was
	reported.
-->
<script lang="ts">
	import type { ChatSide } from '#lib/helpers/chat';
	import { m } from '#lib/paraglide/messages';
	import { getLocale } from '#lib/paraglide/runtime';
	import ChatBubble from './ChatBubble.svelte';
	import HideMessagesModal from './HideMessagesModal.svelte';
	import { hiddenState, type HideTarget } from './hiddenMessages';
	import { dayLabel, groupByDay } from './chatTime';
	import {
		bubblesOf,
		firstMessageAfter,
		type ThreadChat,
		type ThreadMessage
	} from './threadMessages';

	type Message = ThreadMessage & {
		body: string | null;
		createdAt: Date | string;
		paperId?: string | null;
		hiddenAt?: Date | string | null;
		hiddenByName?: string | null;
		hiddenReason?: string | null;
	};

	interface Props {
		messages: readonly Message[];
		chat: ThreadChat;
		side: ChatSide;
		conferenceId: string;
		/** The first message the reader had not read when they opened the chat: a line marks it */
		unreadFromId?: string;
		/** A reported chat: when its first open report came in; a line marks that moment */
		reportedAt?: Date | string | null;
		/** Participant care reviewing the chat may hide what participants wrote */
		canHide?: boolean;
	}

	let {
		messages,
		chat,
		side,
		conferenceId,
		unreadFromId,
		reportedAt = null,
		canHide = false
	}: Props = $props();

	let hideOpen = $state(false);
	let hideTarget = $state<HideTarget>({ kind: 'message', messageId: '' });
	/** What hides a message, where the reader may: a participant's message not hidden yet. */
	function hideOf(message: Message) {
		if (!canHide || message.fromTeam || hiddenState(message) !== 'visible') return undefined;
		return () => {
			hideTarget = { kind: 'message', messageId: message.id };
			hideOpen = true;
		};
	}
	const reportedBeforeId = $derived(
		reportedAt ? firstMessageAfter({ messages, at: reportedAt }) : undefined
	);
	const reportedTime = $derived(
		reportedAt
			? new Date(reportedAt).toLocaleString(getLocale(), {
					dateStyle: 'medium',
					timeStyle: 'short'
				})
			: ''
	);

	const now = new Date();
	const days = $derived(
		groupByDay(messages).map((day) => ({
			day: day.day,
			bubbles: bubblesOf({ messages: day.messages, side, chat })
		}))
	);
</script>

{#snippet reportedLine()}
	<div
		class="text-error my-3 flex items-center gap-3 text-xs font-semibold"
		role="separator"
		data-testid="chat-reported-divider"
	>
		<span class="bg-error/50 h-px flex-1"></span>
		{m.chatReportedAtDivider({ time: reportedTime })}
		<span class="bg-error/50 h-px flex-1"></span>
	</div>
{/snippet}

{#each days as day (day.day.getTime())}
	<div class="text-base-content/60 my-3 flex items-center gap-3 text-xs" role="separator">
		<span class="bg-base-300 h-px flex-1"></span>
		{dayLabel({ date: day.day, now, locale: getLocale() })}
		<span class="bg-base-300 h-px flex-1"></span>
	</div>
	{#each day.bubbles as { message, own, author, continues } (message.id)}
		{#if message.id === unreadFromId}
			<div
				class="text-primary my-3 flex items-center gap-3 text-xs font-semibold"
				role="separator"
				data-unread-divider
				data-testid="chat-unread-divider"
			>
				<span class="bg-primary/50 h-px flex-1"></span>
				{m.chatUnreadDivider()}
				<span class="bg-primary/50 h-px flex-1"></span>
			</div>
		{/if}
		{#if message.id === reportedBeforeId}{@render reportedLine()}{/if}
		<ChatBubble {message} {own} {author} {continues} {conferenceId} onHide={hideOf(message)} />
	{/each}
{/each}
{#if reportedAt && !reportedBeforeId && messages.length > 0}{@render reportedLine()}{/if}

<HideMessagesModal bind:open={hideOpen} target={hideTarget} />
