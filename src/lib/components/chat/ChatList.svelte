<!--
	@component
	The list of chats beside the open one: who it is with, the beginning of the latest message, when
	it came and how much of it is unread. Shows the inbox of a team chat unless the list is narrowed
	to one.
-->
<script lang="ts">
	import { flip } from 'svelte/animate';
	import { prefersReducedMotion } from 'svelte/motion';
	import type { ChatSummary } from '#lib/api/chats';
	import ChatListItem from './ChatListItem.svelte';

	interface Props {
		chats: readonly ChatSummary[];
		selectedId: string | null;
		onSelect: (id: string) => void;
		/** Names the inbox on each team chat, for a list not narrowed to one inbox */
		showInbox?: boolean;
	}

	let { chats, selectedId, onSelect, showInbox = false }: Props = $props();

	const now = new Date();
</script>

<ul class="flex flex-col gap-0.5" data-testid="chat-list">
	{#each chats as chat (chat.id)}
		<!-- a chat with a new message glides to the top instead of jumping there -->
		<li animate:flip={{ duration: prefersReducedMotion.current ? 0 : 250 }}>
			<ChatListItem {chat} selected={chat.id === selectedId} {onSelect} {showInbox} {now} />
		</li>
	{/each}
</ul>
