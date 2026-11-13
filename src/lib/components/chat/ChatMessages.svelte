<!--
	@component
	The messages of a thread, by day: the caller's side on the right, the other on the left, with
	the author's line where a side has more than one voice (`threadMessages.ts`).
-->
<script lang="ts">
	import type { ChatSide } from '#lib/helpers/chat';
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
	}

	let { messages, chat, side, conferenceId }: Props = $props();

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
		<ChatBubble {message} {own} {author} {continues} {conferenceId} />
	{/each}
{/each}
