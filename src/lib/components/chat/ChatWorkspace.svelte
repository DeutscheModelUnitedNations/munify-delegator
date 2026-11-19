<!--
	@component
	The messenger: the chats on the left, the open one on the right. On a phone the two take turns
	(the list, then the thread with a way back). Whoever uses it hands in the chats and says which
	one is open; the thread fetches itself.
-->
<script lang="ts">
	import { untrack, type Snippet } from 'svelte';
	import type { ChatSummary } from '#lib/api/chats';
	import { m } from '#lib/paraglide/messages';
	import ChatList from './ChatList.svelte';
	import ChatThreadBoundary from './ChatThreadBoundary.svelte';
	import { chatViewTransition } from './chatViewTransition';

	interface Props {
		chats: readonly ChatSummary[];
		selectedId: string | null;
		onSelect: (id: string | null) => void;
		showInbox?: boolean;
		/** Above the list: its title, the button for a new message, filters */
		listHeader?: Snippet;
		/** Instead of the list while there is no chat */
		emptyList?: Snippet;
		/** Under the list */
		listFooter?: Snippet;
		/** Beside the list while no chat is open, instead of the hint to pick one */
		noSelection?: Snippet;
		/** Takes its height from the page (a flex child) instead of guessing it from the window */
		fill?: boolean;
		paperId?: string | null;
		onPaperSent?: () => void;
		/**
		 * The chat on screen, which follows `selectedId` once its view transition swaps it in. Bind it
		 * where the page around steps back for an open chat, so that moves along with the transition.
		 */
		shownId?: string | null;
	}

	let {
		chats,
		selectedId,
		onSelect,
		showInbox = false,
		listHeader,
		emptyList,
		listFooter,
		noSelection,
		fill = false,
		paperId = null,
		onPaperSent,
		shownId = $bindable(untrack(() => selectedId))
	}: Props = $props();

	$effect(() => {
		const next = selectedId;
		const current = untrack(() => shownId);
		if (next === current) return;
		chatViewTransition({
			direction: !current ? 'open' : !next ? 'back' : 'switch',
			update: () => (shownId = next)
		});
	});
</script>

<div
	class={[
		// surfaces instead of frame lines: a tinted list column beside the plain thread
		'chat-workspace bg-base-100 ring-base-content/10 grid overflow-hidden rounded-box ring-1',
		fill ? 'min-h-96 flex-1' : 'sized',
		// on a phone an open chat takes the screen: the page around it steps back
		shownId && 'chat-open'
	]}
	data-testid="chat-workspace"
>
	<aside
		class={['chat-list-pane bg-base-200 flex min-h-0 flex-col', shownId && 'max-md:hidden']}
		aria-label={m.chatListLabel()}
		data-tour="chat.list"
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

	<div
		class={['chat-thread-pane min-h-0 min-w-0', !shownId && 'max-md:hidden']}
		data-tour="chat.thread"
	>
		{#if shownId}
			{#key shownId}
				<ChatThreadBoundary
					chatId={shownId}
					onBack={() => onSelect(null)}
					{paperId}
					{onPaperSent}
				/>
			{/key}
		{:else if noSelection}
			{@render noSelection()}
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
	.sized {
		--around: 18rem;
		height: max(24rem, calc(100dvh - var(--header-height, 4rem) - var(--around)));
	}

	@media (width < 48rem) {
		.sized.chat-open {
			height: calc(100dvh - var(--header-height, 4rem) - 2.5rem);
		}
	}

	@media (width >= 48rem) {
		.chat-workspace {
			grid-template-columns: minmax(17rem, 22rem) minmax(0, 1fr);
		}

		.sized {
			height: max(28rem, calc(100dvh - var(--header-height, 4rem) - var(--around)));
		}
	}
</style>
