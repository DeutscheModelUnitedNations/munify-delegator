<!--
	@component
	What waits in the team's chats: open reports of chats (participant care), the unread messages
	per inbox the caller answers, and since when the longest-waiting one waits. Live.
-->
<script lang="ts">
	import { resolve } from '$app/paths';
	import { client } from '#lib/api/rumbleClient/client';
	import DashboardWidget from '#lib/components/dashboard/DashboardWidget.svelte';
	import { canManageParticipants } from '#lib/helpers/teamAccess';
	import { m } from '#lib/paraglide/messages';
	import { getLocale } from '#lib/paraglide/runtime';
	import { createMinuteClock } from '#lib/components/calendar/minuteClock.svelte';
	import type { WaitingAccess } from '../teamWaiting';
	import type { WidgetSize } from '../teamWidgets';
	import { waitedFor } from './waited';
	import { oldestWaiting, unreadByInbox } from './messages';

	let {
		conferenceId,
		size,
		access
	}: { conferenceId: string; size: WidgetSize; access: WaitingAccess } = $props();

	const clock = createMinuteClock();
	const caresForParticipants = $derived(canManageParticipants(access));

	const [chats, reports] = $derived(
		await Promise.all([
			client.liveQuery.chats({
				__args: {
					where: { conferenceId: { eq: conferenceId }, lastMessageAt: { isNotNull: true } }
				},
				kind: true,
				inbox: true,
				side: true,
				unreadCount: true,
				lastMessageAt: true,
				lastParticipantMessageAt: true,
				trustedPersonName: true,
				committee: { abbreviation: true },
				role: { name: true }
			}),
			caresForParticipants
				? client.liveQuery.chatReports({
						__args: {
							where: { conferenceId: { eq: conferenceId }, status: 'OPEN' },
							orderBy: { createdAt: 'asc' }
						},
						createdAt: true
					})
				: []
		])
	);

	const inboxes = $derived(unreadByInbox({ chats, ownChats: m.teamWidgetMessagesOwnChats() }));
	const oldest = $derived(oldestWaiting(chats));
	const oldestReport = $derived(reports[0]?.createdAt);
	const now = $derived(new Date(clock.time));
	const messagesHref = $derived(
		resolve('/(authenticated)/dashboard/[conferenceId]/team/messages', { conferenceId })
	);
	const number = (n: number) => n.toLocaleString(getLocale());
</script>

<DashboardWidget
	icon="chats-circle"
	title={m.teamWidgetMessagesTitle()}
	{size}
	testId="messages"
	href={messagesHref}
	linkLabel={m.teamWidgetMessagesLink()}
	empty={inboxes.length === 0 && reports.length === 0 ? m.teamWidgetMessagesEmpty() : undefined}
>
	{#if reports.length > 0}
		<a
			class="bg-base-200 rounded-box hover:bg-base-300 flex items-center gap-3 px-4 py-3"
			href={resolve(`dashboard/${conferenceId}/team/messages?view=reports`)}
			data-testid="messages-reports"
		>
			<i aria-hidden="true" class="ph-duotone ph-flag text-error text-2xl"></i>
			<span class="flex-1">
				{m.teamWidgetMessagesReports({ count: reports.length })}
				{#if oldestReport}
					<span class="text-base-content/70 text-sm">
						· {m.teamWidgetMessagesOpenSince({
							duration: waitedFor({ since: new Date(oldestReport), now })
						})}</span
					>
				{/if}
			</span>
			<span class="text-primary font-semibold">{m.teamWidgetMessagesOpenReports()}</span>
		</a>
	{/if}
	{#if inboxes.length > 0}
		<ul class="flex flex-col gap-2">
			{#each inboxes as inbox (inbox.label)}
				<li class="flex justify-between gap-3">
					<span>{inbox.label}</span>
					<b class="tabular-nums">{m.teamWidgetMessagesUnread({ count: number(inbox.unread) })}</b>
				</li>
			{/each}
		</ul>
		{#if oldest}
			<p class="text-base-content/70 text-sm" data-testid="messages-oldest">
				{m.teamWidgetMessagesOldest({ duration: waitedFor({ since: oldest, now }) })}
			</p>
		{/if}
	{/if}
</DashboardWidget>
