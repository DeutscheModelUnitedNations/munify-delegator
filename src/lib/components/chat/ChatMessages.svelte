<!--
	@component
	The messages of a thread, by day: the caller's side on the right, the other on the left, with
	the author's line where a side has more than one voice (`threadMessages.ts`).
-->
<script lang="ts">
	import { resolve } from '$app/paths';
	import type { ChatSide } from '#lib/helpers/chat';
	import { m } from '#lib/paraglide/messages';
	import { getLocale } from '#lib/paraglide/runtime';
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

	const timeOf = (date: Date | string) =>
		new Date(date).toLocaleTimeString(getLocale(), { hour: '2-digit', minute: '2-digit' });
</script>

{#each days as day (day.day.getTime())}
	<div class="text-base-content/60 my-3 flex items-center gap-3 text-xs" role="separator">
		<span class="bg-base-300 h-px flex-1"></span>
		{dayLabel({ date: day.day, now, locale: getLocale() })}
		<span class="bg-base-300 h-px flex-1"></span>
	</div>
	{#each day.bubbles as { message, own, author, continues } (message.id)}
		<div
			class={[
				'flex max-w-full flex-col',
				own ? 'items-end' : 'items-start',
				continues ? 'mt-1' : 'mt-3'
			]}
			data-testid="chat-message"
		>
			{#if author}
				<span class="text-base-content/60 mb-0.5 px-1 text-xs">{author}</span>
			{/if}
			<div
				class={[
					'max-w-[85%] rounded-2xl px-3.5 py-2 text-sm sm:max-w-[70%]',
					own
						? 'bg-primary text-primary-content rounded-br-md'
						: 'bg-base-200 text-base-content rounded-bl-md'
				]}
			>
				{#if message.paperId}
					<a
						href={resolve(`dashboard/${conferenceId}/paperhub/${message.paperId}`)}
						class={[
							'mb-1.5 flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium',
							own ? 'bg-primary-content/15' : 'bg-base-300'
						]}
					>
						<i aria-hidden="true" class="ph-duotone ph-file-text"></i>
						{m.chatAboutPaper()}
					</a>
				{/if}
				<p class="break-words whitespace-pre-wrap">{message.body}</p>
				<time
					class={['mt-0.5 block text-right text-xs', own ? 'opacity-80' : 'text-base-content/60']}
					datetime={new Date(message.createdAt).toISOString()}
				>
					{timeOf(message.createdAt)}
				</time>
			</div>
		</div>
	{/each}
{/each}
