<!--
	@component
	What is on right now while the conference runs, and what comes next, over the whole schedule
	(a team member has no seat, so every entry counts, parallel copies once; `UpcomingEntries`).
	Follows the team's changes and the clock; the team reads the schedule whatever the
	participants' switch says. While a MUNify CHASE is linked, it leads there too.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import { resolve } from '$app/paths';
	import { fetchCalendarDays } from '#lib/api/calendarDays';
	import { fetchActiveChaseLink } from '#lib/api/chaseLink';
	import { liveSnapshot } from '#lib/api/liveSnapshot';
	import { client } from '#lib/api/rumbleClient/client';
	import { entriesForSeat } from '#lib/components/calendar/calendarNow';
	import DashboardWidget from '#lib/components/dashboard/DashboardWidget.svelte';
	import { m } from '#lib/paraglide/messages';
	import UpcomingEntries from '../../../sections/UpcomingEntries.svelte';
	import { mayOpen, type WidgetSize } from '../teamWidgets';
	import type { WaitingAccess } from '../teamWaiting';

	let {
		conferenceId,
		size,
		access
	}: { conferenceId: string; size: WidgetSize; access: WaitingAccess } = $props();

	const [conference, liveDays, chaseLink] = $derived(
		await Promise.all([
			client.liveQuery.conference({ __args: { id: conferenceId }, timezone: true }),
			fetchCalendarDays(conferenceId),
			fetchActiveChaseLink()
		])
	);

	const snapshot = liveSnapshot<(typeof liveDays)[number]>();
	const days = $derived(snapshot(liveDays));
	const entries = $derived(entriesForSeat({ days, seat: { committeeIds: [], roleIds: [] } }));

	const chaseUrl = $derived(
		chaseLink ? `${chaseLink.remoteUrl.replace(/\/+$/, '')}/app/${conferenceId}` : undefined
	);
	const scheduleHref = $derived(
		mayOpen({ routeId: 'calendar', access })
			? resolve('/(authenticated)/dashboard/[conferenceId]/team/calendar', { conferenceId })
			: resolve('/(authenticated)/dashboard/[conferenceId]/calendar', { conferenceId })
	);
</script>

{#snippet widget(content: Snippet | undefined)}
	<DashboardWidget
		icon="calendar-dots"
		title={m.teamWidgetNowTitle()}
		{size}
		testId="now"
		href={scheduleHref}
		linkLabel={m.calendarFullSchedule()}
		empty={content ? undefined : m.teamWidgetNowNothing()}
	>
		{#snippet headerAction()}
			{#if chaseUrl}
				<a class="btn btn-ghost btn-sm" href={chaseUrl} target="_blank" rel="noopener">
					<i aria-hidden="true" class="ph-duotone ph-arrow-square-out"></i>
					{m.chaseStatusOpen()}
				</a>
			{/if}
		{/snippet}
		{@render content?.()}
	</DashboardWidget>
{/snippet}

<UpcomingEntries {days} {entries} timezone={conference.timezone} columns={size === 'large'}>
	{#snippet frame(content)}
		{@render widget(content)}
	{/snippet}
	{#snippet empty()}
		{@render widget(undefined)}
	{/snippet}
</UpcomingEntries>
