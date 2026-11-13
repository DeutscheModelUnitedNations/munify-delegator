<!--
	@component
	The messages of a thread, by day: the caller's side on the right, the other on the left, with
	the author's line where a side has more than one voice (`threadMessages.ts`), and a line above
	the first message the reader had not read yet.
-->
<script lang="ts">
	import type { ChatSide } from '#lib/helpers/chat';
	import { m } from '#lib/paraglide/messages';
	import { getLocale } from '#lib/paraglide/runtime';
	import ChatBubble from './ChatBubble.svelte';
	import { dayLabel, groupByDay } from './chatTime';
	import { bubblesOf, type ThreadChat, type ThreadMessage } from './threadMessages';

	type Message = ThreadMessage & {
		body: string;
		createdAt: Date | string;
		paperId?: string | null;
	};

	interface Props {
		messages: readonly Message[];
		chat: ThreadChat;
		side: ChatSide;
		conferenceId: string;
		/** The first message the reader had not read when they opened the chat: a line marks it */
		unreadFromId?: string;
	}

	let { messages, chat, side, conferenceId, unreadFromId }: Props = $props();

	const now = new Date();
	const days = $derived(
		groupByDay(messages).map((day) => ({
			day: day.day,
			bubbles: bubblesOf({ messages: day.messages, side, chat })
		}))
	);
</script>

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
		<ChatBubble {message} {own} {author} {continues} {conferenceId} />
	{/each}
{/each}
