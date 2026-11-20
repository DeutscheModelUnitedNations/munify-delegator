<!--
	@component
	The head of an open chat: who it is with, and what the caller can do about it. A participant
	blocks or reports a chat with other participants; whoever answers its inbox opens the user cards
	of the people in it and files it in the archive.
-->
<script lang="ts">
	import type { OpenChat } from '#lib/api/chats';
	import type { ChatSide } from '#lib/helpers/chat';
	import { m } from '#lib/paraglide/messages';
	import UserCardButton from './UserCardButton.svelte';
	import ChatArchiveButton from './ChatArchiveButton.svelte';
	import ChatAvatar from './ChatAvatar.svelte';
	import ChatThreadMenu from './ChatThreadMenu.svelte';
	import { chatAvatar, chatTitle, threadSubtitle } from './chatLabels';

	interface Props {
		chat: OpenChat;
		side: ChatSide;
		/** On a phone the thread fills the page; this leads back to the list */
		onBack?: () => void;
	}

	let { chat, side, onBack }: Props = $props();

	const asParticipant = $derived(side === 'PARTICIPANT');
</script>

<header class="border-base-content/10 flex items-center gap-3 border-b px-3 py-2.5 sm:px-4">
	{#if onBack}
		<button
			type="button"
			class="btn btn-ghost btn-sm btn-square md:hidden"
			aria-label={m.chatBackToList()}
			onclick={onBack}
		>
			<i aria-hidden="true" class="ph-duotone ph-arrow-left"></i>
		</button>
	{/if}
	<ChatAvatar avatar={chatAvatar(chat)} />
	<div class="flex min-w-0 flex-1 flex-col">
		<h2 class="truncate font-semibold" data-testid="chat-title">{chatTitle(chat)}</h2>
		<p class="text-base-content/60 truncate text-xs">{threadSubtitle(chat)}</p>
	</div>

	<!-- reviewing, the case file beside the chat already names everybody with their card -->
	{#if side === 'TEAM'}
		<div class="flex shrink-0 gap-1">
			{#each chat.people as person (person.participantId)}
				<UserCardButton userId={person.userId} name={person.name} />
			{/each}
			<ChatArchiveButton chatId={chat.id} archived={chat.archived} onArchived={onBack} />
		</div>
	{:else if asParticipant && chat.kind !== 'TEAM'}
		<ChatThreadMenu
			chatId={chat.id}
			direct={chat.kind === 'DIRECT'}
			blockedByMe={chat.blockedByMe}
		/>
	{/if}
</header>
