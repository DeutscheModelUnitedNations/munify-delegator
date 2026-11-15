<!--
	@component
	The messenger: the chats on the left, the open one on the right. On a phone the two take turns
	(the list, then the thread with a way back). Whoever uses it hands in the chats and says which
	one is open; the thread fetches itself.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { ChatSummary } from '#lib/api/chats';
	import { m } from '#lib/paraglide/messages';
	import ChatList from './ChatList.svelte';
	import ChatThreadBoundary from './ChatThreadBoundary.svelte';

	interface Props {
		chats: readonly ChatSummary[];
		selectedId: string | null;
		onSelect: (id: string | null) => void;
		showInbox?: boolean;
		/** Above the list: its title, the button for a new message, filters */
		listHeader?: Snippet;
		/** Instead of the list while there is no chat */
		emptyList?: Snippet;
		/** Under the list: settings */
		listFooter?: Snippet;
		paperId?: string | null;
		onPaperSent?: () => void;
	}

	let {
		chats,
		selectedId,
		onSelect,
		showInbox = false,
		listHeader,
		emptyList,
		listFooter,
		paperId = null,
		onPaperSent
	}: Props = $props();
</script>

<div
	class={[
		'chat-workspace border-base-300 bg-base-100 grid overflow-hidden rounded-box border shadow-sm',
		// on a phone an open chat takes the screen: the page around it steps back
		selectedId && 'chat-open'
	]}
	data-testid="chat-workspace"
>
	<aside
		class={['border-base-300 flex min-h-0 flex-col md:border-r', selectedId && 'max-md:hidden']}
		aria-label={m.chatListLabel()}
	>
		{@render listHeader?.()}
		<div class="min-h-0 flex-1 overflow-y-auto p-2">
			{#if chats.length === 0}
				{@render emptyList?.()}
			{:else}
				<ChatList {chats} {selectedId} {showInbox} onSelect={(id) => onSelect(id)} />
			{/if}
		</div>
		{@render listFooter?.()}
	</aside>

	<div class={['min-h-0 min-w-0', !selectedId && 'max-md:hidden']}>
		{#if selectedId}
			{#key selectedId}
				<ChatThreadBoundary
					chatId={selectedId}
					onBack={() => onSelect(null)}
					{paperId}
					{onPaperSent}
				/>
			{/key}
		{:else}
			<div
				class="text-base-content/60 flex h-full flex-col items-center justify-center gap-3 p-8 text-center"
			>
				<i aria-hidden="true" class="ph-duotone ph-chats-circle text-5xl"></i>
				<p class="max-w-xs">{m.chatSelectPrompt()}</p>
			</div>
		{/if}
	</div>
</div>

<style>
	/* Fills the window below the page's header, and never gets too short to read a chat in. */
	.chat-workspace {
		--around: 18rem;
		height: max(24rem, calc(100dvh - var(--header-height, 4rem) - var(--around)));
	}

	@media (width < 48rem) {
		.chat-workspace.chat-open {
			height: calc(100dvh - var(--header-height, 4rem) - 2.5rem);
		}
	}

	@media (width >= 48rem) {
		.chat-workspace {
			grid-template-columns: minmax(17rem, 22rem) minmax(0, 1fr);
			height: max(28rem, calc(100dvh - var(--header-height, 4rem) - var(--around)));
		}
	}
</style>
