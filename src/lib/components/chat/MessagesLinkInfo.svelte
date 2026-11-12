<!--
	@component
	What the dashboard's messages card says about the caller's chats: how many hold something
	unread, and the latest of them by who they are with. Nothing while everything is read.
-->
<script lang="ts">
	import { fetchChats } from '#lib/api/chats';
	import { m } from '#lib/paraglide/messages';
	import ChatAvatar from './ChatAvatar.svelte';
	import { chatAvatar, chatTitle, unreadChats } from './chatLabels';

	let { conferenceId }: { conferenceId: string } = $props();

	const chats = $derived(await fetchChats({ conferenceId }));
	const { unread, total } = $derived(unreadChats(chats));
</script>

{#if unread.length > 0}
	<div class="mt-2 flex flex-col gap-1.5" data-testid="messages-link-unread">
		<span class="badge badge-primary badge-sm self-start">
			{m.chatUnreadCount({ count: total })}
		</span>
		<ul class="flex flex-col gap-1">
			{#each unread.slice(0, 2) as chat (chat.id)}
				<li class="flex items-center gap-2 text-sm">
					<ChatAvatar avatar={chatAvatar(chat)} size="sm" />
					<span class="flex min-w-0 flex-col leading-tight">
						<span class="truncate font-medium">{chatTitle(chat)}</span>
						<span class="text-base-content/60 truncate text-xs">{chat.lastMessagePreview}</span>
					</span>
				</li>
			{/each}
		</ul>
	</div>
{/if}
