<!--
	@component
	The chats of the inboxes the caller answers, as a messenger: all of them at once, narrowed to
	one inbox by its chip, the open ones in the list and the archived ones (put away until their
	next message) only once the archive is shown. Reported chats waiting for participant care show
	as a banner above the list.
-->
<script lang="ts">
	import { resolve } from '$app/paths';
	import type { ChatSummary } from '#lib/api/chats';
	import ChatListHeader from '#lib/components/chat/ChatListHeader.svelte';
	import ChatWorkspace from '#lib/components/chat/ChatWorkspace.svelte';
	import FilterChips from '#lib/components/FilterChips.svelte';
	import { inboxName } from '#lib/components/chat/chatLabels';
	import { m } from '#lib/paraglide/messages';
	import ArchiveToggle from './ArchiveToggle.svelte';
	import { inboxKey, listedChats, unreadByInbox, type TeamInbox } from './teamInboxes';

	interface Props {
		conferenceId: string;
		/** The chats of every inbox the caller answers, archived ones included */
		chats: readonly ChatSummary[];
		inboxes: readonly TeamInbox[];
		/** The key of the inbox the list is narrowed to; null for all */
		selectedInbox: string | null;
		onInbox: (key: string | null) => void;
		/** Offers "new message" */
		onNew?: () => void;
		selectedId: string | null;
		onSelect: (id: string | null) => void;
		showArchive: boolean;
		onArchive: (shown: boolean) => void;
		/** How many reported chats wait; undefined for who does not get the reports */
		reported?: number;
		paperId: string | null;
		onPaperSent: () => void;
	}

	let {
		conferenceId,
		chats,
		inboxes,
		selectedInbox,
		onInbox,
		onNew,
		selectedId,
		onSelect,
		showArchive,
		onArchive,
		reported,
		paperId,
		onPaperSent
	}: Props = $props();

	const unreadOf = $derived(unreadByInbox(chats));
	const shownChats = $derived(
		selectedInbox ? chats.filter((chat) => inboxKey(chat) === selectedInbox) : chats
	);
	const listed = $derived(listedChats({ chats: shownChats, showArchive }));
	const several = $derived(inboxes.length > 1);
	const label = (inbox: TeamInbox) => (inbox.own ? m.chatInboxTrustedOwn() : inboxName(inbox));
</script>

<ChatWorkspace
	chats={listed.chats}
	{selectedId}
	{onSelect}
	showInbox={several && !selectedInbox}
	{paperId}
	{onPaperSent}
	fill
>
	{#snippet listHeader()}
		<ChatListHeader title={m.chatChats()} {onNew}>
			{#snippet actions()}
				<a
					href={resolve('my-account/notifications')}
					class="btn btn-ghost btn-sm btn-square"
					title={m.chatTeamNotificationsLink()}
					aria-label={m.chatTeamNotificationsLink()}
					data-testid="team-notifications-link"
					data-tour="team.messages.notifications"
				>
					<i aria-hidden="true" class="ph-duotone ph-bell text-lg"></i>
				</a>
			{/snippet}
			{#if reported}
				<a
					href={resolve(`dashboard/${conferenceId}/team/messages?view=reports`)}
					class="bg-error/10 text-error hover:bg-error/20 flex items-center gap-2 rounded-box px-3 py-2 text-sm font-medium transition-colors"
					data-testid="team-reports-banner"
					data-tour="team.messages.reports"
				>
					<i aria-hidden="true" class="ph-duotone ph-flag"></i>
					<span class="flex-1">{m.chatReportsWaiting({ count: reported })}</span>
					<i aria-hidden="true" class="ph-duotone ph-arrow-right"></i>
				</a>
			{/if}
			{#if several}
				<FilterChips
					options={inboxes}
					selected={selectedInbox}
					onSelect={onInbox}
					label={m.chatFilterByInbox()}
				>
					{#snippet chip(inbox)}
						{@const unread = unreadOf.get(inbox.key) ?? 0}
						{label(inbox)}
						{#if unread > 0}
							<span class="badge badge-primary badge-xs">
								<span aria-hidden="true">{unread}</span>
								<span class="sr-only">{m.chatUnreadCount({ count: unread })}</span>
							</span>
						{/if}
					{/snippet}
				</FilterChips>
			{/if}
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
	{#snippet noSelection()}
		<div
			class="text-base-content/60 flex h-full flex-col items-center justify-center gap-3 p-8 text-center"
		>
			<i aria-hidden="true" class="ph-duotone ph-chats-circle text-primary text-5xl"></i>
			<p class="max-w-sm">{m.chatSelectPrompt()}</p>
			<p class="flex max-w-sm items-start gap-2 text-sm">
				<i aria-hidden="true" class="ph-duotone ph-identification-badge mt-0.5"></i>
				{m.chatTeamAnswerHint()}
			</p>
		</div>
	{/snippet}
</ChatWorkspace>
