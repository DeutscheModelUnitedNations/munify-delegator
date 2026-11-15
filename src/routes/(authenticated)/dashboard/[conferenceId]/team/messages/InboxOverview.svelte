<!--
	@component
	Where the messages start for somebody answering several inboxes: every inbox as a card with how
	many chats it holds and how much is unread, a committee's inboxes under its name, and the
	reports for participant care. A card opens its inbox.
-->
<script lang="ts">
	import { resolve } from '$app/paths';
	import type { ChatSummary } from '#lib/api/chats';
	import { INBOX_ICON, inboxName } from '#lib/components/chat/chatLabels';
	import { m } from '#lib/paraglide/messages';
	import InboxCard from './InboxCard.svelte';
	import { inboxKey, inboxMenu, unreadByInbox, type TeamInbox } from './teamInboxes';

	interface Props {
		conferenceId: string;
		inboxes: readonly TeamInbox[];
		/** The chats of the inboxes the caller answers */
		chats: readonly ChatSummary[];
		/** How many reported chats wait; undefined for who does not get the reports */
		reported?: number;
	}

	let { conferenceId, inboxes, chats, reported }: Props = $props();

	const unreadOf = $derived(unreadByInbox(chats));
	const entries = $derived(inboxMenu(inboxes));
	// the inboxes standing alone first, then each committee holding several under its name
	const plain = $derived(entries.flatMap((entry) => (entry.kind === 'inbox' ? [entry.inbox] : [])));
	const committees = $derived(
		entries.flatMap((entry) => (entry.kind === 'committee' ? [entry] : []))
	);
	// the archive is put away: a card counts what is open
	const chatsIn = (key: string) =>
		chats.filter((chat) => !chat.archived && inboxKey(chat) === key).length;
	const inboxQuery = (key: string) => new URLSearchParams({ inbox: key }).toString();
</script>

{#snippet card(inbox: TeamInbox, title: string)}
	{@const unread = unreadOf.get(inbox.key) ?? 0}
	<li>
		<InboxCard
			href={resolve(`dashboard/${conferenceId}/team/messages?${inboxQuery(inbox.key)}`)}
			icon="ph-{INBOX_ICON[inbox.inbox]}"
			{title}
			detail={m.chatInboxChatCount({ count: chatsIn(inbox.key) })}
			waiting={unread > 0}
			badge={unread > 0 ? m.chatUnreadCount({ count: unread }) : undefined}
			testid="team-inbox-card"
		/>
	</li>
{/snippet}

<div class="flex flex-col gap-5" data-testid="team-inbox-overview">
	<ul class="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
		{#each plain as inbox (inbox.key)}
			{@render card(inbox, inbox.own ? m.chatInboxTrustedOwn() : inboxName(inbox))}
		{/each}
		{#if reported !== undefined}
			<li>
				<InboxCard
					href={resolve(`dashboard/${conferenceId}/team/messages?view=reports`)}
					icon="ph-flag"
					tone="text-error"
					title={m.chatReports()}
					detail={reported > 0 ? m.chatReportsWaiting({ count: reported }) : m.chatNoOpenReports()}
					waiting={reported > 0}
					testid="team-reports-card"
				/>
			</li>
		{/if}
	</ul>

	{#each committees as committee (committee.abbreviation)}
		<section class="flex flex-col gap-2">
			<h2 class="text-base-content/70 text-sm font-semibold">{committee.abbreviation}</h2>
			<ul class="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
				{#each committee.inboxes as inbox (inbox.key)}
					{@render card(inbox, inboxName({ inbox: inbox.inbox }))}
				{/each}
			</ul>
		</section>
	{/each}
</div>
