<!--
	@component
	What "Messages" folds open into in the team menu: the overview, every inbox with how much of it
	is unread (a committee holding several as a group of its own to fold) and, for participant
	care, the reports.
-->
<script lang="ts">
	import { resolve } from '$app/paths';
	import { inboxName } from '#lib/components/chat/chatLabels';
	import { m } from '#lib/paraglide/messages';
	import InboxNavLink from './InboxNavLink.svelte';
	import { inboxMenu, type TeamInbox } from './teamInboxes';

	interface Props {
		conferenceId: string;
		inboxes: readonly TeamInbox[];
		unreadOf: ReadonlyMap<string, number>;
		/** How many reported chats wait; undefined for who does not get the reports */
		reported?: number;
		/** What is on screen: an inbox's key, 'reports', 'overview', or null on another page */
		current: string | null;
	}

	let { conferenceId, inboxes, unreadOf, reported, current }: Props = $props();

	const entries = $derived(inboxMenu(inboxes));
	const unread = (inbox: TeamInbox) => unreadOf.get(inbox.key) ?? 0;
	const sum = (group: readonly TeamInbox[]) =>
		group.reduce((total, inbox) => total + unread(inbox), 0);
	const hrefOf = (inbox: TeamInbox) =>
		resolve(
			`dashboard/${conferenceId}/team/messages?${new URLSearchParams({ inbox: inbox.key }).toString()}`
		);
</script>

{#snippet link(inbox: TeamInbox, title: string)}
	<InboxNavLink
		href={hrefOf(inbox)}
		{title}
		active={current === inbox.key}
		count={unread(inbox)}
		countLabel={m.chatUnreadCount({ count: unread(inbox) })}
		testid="team-inbox-link"
	/>
{/snippet}

<InboxNavLink
	href={resolve(`dashboard/${conferenceId}/team/messages`)}
	title={m.chatInboxOverview()}
	active={current === 'overview'}
	testid="team-inbox-all"
/>
{#each entries as entry (entry.kind === 'inbox' ? entry.inbox.key : entry.abbreviation)}
	{#if entry.kind === 'inbox'}
		{@render link(entry.inbox, entry.inbox.own ? m.chatInboxTrustedOwn() : inboxName(entry.inbox))}
	{:else}
		{@const waiting = sum(entry.inboxes)}
		<li class="min-w-0">
			<details
				class="w-full min-w-0"
				open={waiting > 0 || entry.inboxes.some((inbox) => inbox.key === current)}
			>
				<summary class="flex w-full min-w-0 items-center gap-2">
					<span class="min-w-0 flex-1 truncate">{entry.abbreviation}</span>
					{#if waiting > 0}
						<span class="badge badge-primary badge-xs shrink-0">
							<span aria-hidden="true">{waiting}</span>
							<span class="sr-only">{m.chatUnreadCount({ count: waiting })}</span>
						</span>
					{/if}
				</summary>
				<ul class="min-w-0">
					{#each entry.inboxes as inbox (inbox.key)}
						{@render link(inbox, inboxName({ inbox: inbox.inbox }))}
					{/each}
				</ul>
			</details>
		</li>
	{/if}
{/each}
{#if reported !== undefined}
	<InboxNavLink
		href={resolve(`dashboard/${conferenceId}/team/messages?view=reports`)}
		title={m.chatReports()}
		active={current === 'reports'}
		count={reported}
		countLabel={m.chatReportsWaiting({ count: reported })}
		icon="ph-flag"
		testid="team-reports-link"
	/>
{/if}
