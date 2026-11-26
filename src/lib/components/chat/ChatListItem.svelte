<!--
	@component
	One chat in the list: who it is with, the beginning of the latest message, when it came and how
	much of it is unread, with the badge `listBadge` gives it.
-->
<script lang="ts">
	import { prefersReducedMotion } from 'svelte/motion';
	import { scale } from 'svelte/transition';
	import { backOut } from 'svelte/easing';
	import { m } from '#lib/paraglide/messages';
	import { getLocale } from '#lib/paraglide/runtime';
	import type { ChatSummary } from '#lib/api/chats';
	import ChatAvatar from './ChatAvatar.svelte';
	import ChatListBadges from './ChatListBadges.svelte';
	import { chatAvatar, chatSubtitle, chatTitle } from './chatLabels';
	import { listTime } from './chatTime';

	interface Props {
		chat: ChatSummary;
		selected: boolean;
		onSelect: (id: string) => void;
		/** Names the inbox on a team chat, for a list not narrowed to one inbox */
		showInbox: boolean;
		now: Date;
	}

	let { chat, selected, onSelect, showInbox, now }: Props = $props();

	const subtitle = $derived(chatSubtitle(chat));
	const unread = $derived(chat.unreadCount > 0);
	const time = $derived(
		chat.lastMessageAt
			? listTime({ date: new Date(chat.lastMessageAt), now, locale: getLocale() })
			: null
	);
</script>

<button
	type="button"
	class={[
		'flex w-full items-center gap-3 rounded-box px-3 py-2.5 text-left transition-colors',
		selected ? 'bg-primary/15' : 'hover:bg-base-content/5'
	]}
	aria-current={selected ? 'true' : undefined}
	onclick={() => onSelect(chat.id)}
>
	<ChatAvatar avatar={chatAvatar(chat)} />
	<span class="flex min-w-0 flex-1 flex-col">
		<span class="flex items-baseline gap-2">
			<span class={['min-w-0 flex-1 truncate', unread && 'font-semibold']}>
				{chatTitle(chat)}
			</span>
			{#if time}
				<span class="text-base-content/60 shrink-0 text-xs">{time}</span>
			{/if}
		</span>
		{#if subtitle}
			<span class="text-base-content/70 truncate text-xs">{subtitle}</span>
		{/if}
		<span class="flex items-center gap-2">
			<span
				class={[
					'min-w-0 flex-1 truncate text-sm',
					unread ? 'text-base-content' : 'text-base-content/60'
				]}
			>
				{chat.lastMessagePreview ?? ''}
			</span>
			<ChatListBadges {chat} {showInbox} />
			{#if unread}
				<span
					class="badge badge-primary badge-sm shrink-0"
					in:scale={{
						start: 0.5,
						duration: prefersReducedMotion.current ? 0 : 220,
						easing: backOut
					}}
				>
					{chat.unreadCount}
					<span class="sr-only">{m.chatUnreadMessages()}</span>
				</span>
			{/if}
		</span>
	</span>
</button>
