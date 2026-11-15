<!--
	@component
	The chats of the inboxes the caller answers, as a messenger: the open ones in the list, the
	archived ones (put away until their next message) only once the archive is shown.
-->
<script lang="ts">
	import type { ChatSummary } from '#lib/api/chats';
	import ChatListHeader from '#lib/components/chat/ChatListHeader.svelte';
	import ChatWorkspace from '#lib/components/chat/ChatWorkspace.svelte';
	import { m } from '#lib/paraglide/messages';
	import ArchiveToggle from './ArchiveToggle.svelte';
	import { listedChats } from './teamInboxes';

	interface Props {
		/** The chats of the inbox shown, archived ones included */
		chats: readonly ChatSummary[];
		title: string;
		/** Offers "new message" */
		onNew?: () => void;
		selectedId: string | null;
		onSelect: (id: string | null) => void;
		/** Names the inbox on each chat, for a list holding several inboxes */
		showInbox: boolean;
		showArchive: boolean;
		onArchive: (shown: boolean) => void;
		paperId: string | null;
		onPaperSent: () => void;
	}

	let {
		chats,
		title,
		onNew,
		selectedId,
		onSelect,
		showInbox,
		showArchive,
		onArchive,
		paperId,
		onPaperSent
	}: Props = $props();

	const listed = $derived(listedChats({ chats, showArchive }));
</script>

<ChatWorkspace chats={listed.chats} {selectedId} {onSelect} {showInbox} {paperId} {onPaperSent}>
	{#snippet listHeader()}
		<ChatListHeader {title} {onNew}>
			{#if listed.archived > 0 || showArchive}
				<ArchiveToggle shown={showArchive} count={listed.archived} onToggle={onArchive} />
			{/if}
		</ChatListHeader>
	{/snippet}
	{#snippet emptyList()}
		<div class="text-base-content/60 flex flex-col items-center gap-3 px-4 py-10 text-center">
			<i aria-hidden="true" class="ph-duotone ph-tray text-4xl"></i>
			<p>{listed.archived > 0 ? m.chatInboxAllArchived() : m.chatInboxEmpty()}</p>
		</div>
	{/snippet}
</ChatWorkspace>
