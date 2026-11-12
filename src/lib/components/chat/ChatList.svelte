<!--
	@component
	The list of chats beside the open one: who it is with, the beginning of the latest message, when
	it came and how much of it is unread. Shows the inbox of a team chat when the list mixes several.
-->
<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import { getLocale } from '#lib/paraglide/runtime';
	import type { ChatSummary } from '#lib/api/chats';
	import ChatAvatar from './ChatAvatar.svelte';
	import { chatAvatar, chatSubtitle, chatTitle, inboxName, sideOf } from './chatLabels';
	import { listTime } from './chatTime';

	interface Props {
		chats: readonly ChatSummary[];
		selectedId: string | null;
		onSelect: (id: string) => void;
		/** Names the inbox on each team chat, for a list holding several inboxes */
		showInbox?: boolean;
	}

	let { chats, selectedId, onSelect, showInbox = false }: Props = $props();

	const now = new Date();
</script>

<ul class="flex flex-col gap-0.5" data-testid="chat-list">
	{#each chats as chat (chat.id)}
		{@const title = chatTitle(chat)}
		{@const subtitle = chatSubtitle(chat)}
		{@const selected = chat.id === selectedId}
		<li>
			<button
				type="button"
				class={[
					'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
					selected ? 'bg-primary/10' : 'hover:bg-base-200'
				]}
				aria-current={selected ? 'true' : undefined}
				onclick={() => onSelect(chat.id)}
			>
				<ChatAvatar avatar={chatAvatar(chat)} />
				<span class="flex min-w-0 flex-1 flex-col">
					<span class="flex items-baseline gap-2">
						<span class={['min-w-0 flex-1 truncate', chat.unreadCount > 0 && 'font-semibold']}>
							{title}
						</span>
						{#if chat.lastMessageAt}
							<span class="text-base-content/60 shrink-0 text-xs">
								{listTime({ date: new Date(chat.lastMessageAt), now, locale: getLocale() })}
							</span>
						{/if}
					</span>
					{#if subtitle}
						<span class="text-base-content/70 truncate text-xs">{subtitle}</span>
					{/if}
					<span class="flex items-center gap-2">
						<span
							class={[
								'min-w-0 flex-1 truncate text-sm',
								chat.unreadCount > 0 ? 'text-base-content' : 'text-base-content/60'
							]}
						>
							{chat.lastMessagePreview ?? ''}
						</span>
						{#if chat.underReview && sideOf(chat) === 'REVIEW'}
							<span class="badge badge-warning badge-sm shrink-0">{m.chatReported()}</span>
						{:else if showInbox && chat.inbox && sideOf(chat) === 'TEAM'}
							<span class="badge badge-ghost badge-sm shrink-0">
								{inboxName({
									inbox: chat.inbox,
									committeeAbbreviation: chat.committee?.abbreviation
								})}
							</span>
						{/if}
						{#if chat.unreadCount > 0}
							<span class="badge badge-primary badge-sm shrink-0">
								{chat.unreadCount}
								<span class="sr-only">{m.chatUnreadMessages()}</span>
							</span>
						{/if}
					</span>
				</span>
			</button>
		</li>
	{/each}
</ul>
