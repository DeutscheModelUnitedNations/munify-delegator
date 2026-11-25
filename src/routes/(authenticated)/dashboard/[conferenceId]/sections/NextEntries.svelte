<!--
	@component
	Where the signed-in person has to be: what is on now on their track, or how long until the next
	thing starts, then what comes after it. Follows the team's changes and the clock. Shows nothing
	while the schedule is switched off or when nothing is left.
-->
<script lang="ts">
	import { resolve } from '$app/paths';
	import { client } from '#lib/api/rumbleClient/client';
	import { fetchCalendarDays } from '#lib/api/calendarDays';
	import { liveSnapshot } from '#lib/api/liveSnapshot';
	import { fetchMyParticipation } from '#lib/api/myConferenceParticipation';
	import CalendarEntryDrawer from '#lib/components/calendar/CalendarEntryDrawer.svelte';
	import ScheduleTimeline from '#lib/components/calendar/ScheduleTimeline.svelte';
	import { entryTrackSummary } from '#lib/components/calendar/calendarDisplay';
	import {
		entriesForSeat,
		leadOfTimeline,
		seatOf,
		startsIn,
		timelineOf
	} from '#lib/components/calendar/calendarNow';
	import { createMinuteClock } from '#lib/components/calendar/minuteClock.svelte.js';
	import DashboardSection from '#lib/components/dashboard/DashboardSection.svelte';
	import { calendarDayText } from '#lib/helpers/calendarDay';
	import { formatClock } from '#lib/helpers/formatClock';
	import { m } from '#lib/paraglide/messages';
	import { getLocale } from '#lib/paraglide/runtime';
	import NextEntryCard from './NextEntryCard.svelte';

	let { conferenceId }: { conferenceId: string } = $props();

	const [conference, liveDays, participation] = $derived(
		await Promise.all([
			client.liveQuery.conference({
				__args: { id: conferenceId },
				timezone: true,
				showCalendar: true
			}),
			fetchCalendarDays(conferenceId),
			fetchMyParticipation(conferenceId)
		])
	);

	const snapshot = liveSnapshot<(typeof liveDays)[number]>();
	const days = $derived(snapshot(liveDays));
	const seat = $derived(seatOf(participation));
	const timezone = $derived(conference.timezone);
	const clock = createMinuteClock();
	const now = $derived(new Date(clock.time));

	const entries = $derived(entriesForSeat({ days, seat }));
	const view = $derived(
		leadOfTimeline({
			timeline: timelineOf({ entries, timezone, now, count: 4 }),
			count: 3
		})
	);

	// By id, so the open drawer shows what the team changes meanwhile
	let selectedId = $state<string>();
	let drawerOpen = $state(false);
	const selected = $derived(entries.find((entry) => entry.id === selectedId) ?? null);
	const selectedDay = $derived(
		days.find((day) => day.entries.some((entry) => entry.id === selectedId)) ?? null
	);

	function open(entry: { id: string }) {
		selectedId = entry.id;
		drawerOpen = true;
	}

	const startText = (entry: { startTime: Date }) =>
		startsIn({ startTime: entry.startTime, timezone, now, locale: getLocale() });
</script>

{#if conference.showCalendar && (view.running.length > 0 || view.next)}
	<DashboardSection
		icon="calendar-dots"
		title={m.calendarNextEntries()}
		tourAnchor="dashboard.next-entries"
	>
		<div class="flex flex-col gap-3">
			{#each view.running as entry (entry.id)}
				<NextEntryCard
					{entry}
					label={m.calendarNow()}
					running
					time={m.calendarUntil({ time: formatClock({ time: entry.endTime }) })}
					onclick={() => open(entry)}
				/>
			{/each}
			{#if view.next}
				{@const { entry, newDay } = view.next}
				<NextEntryCard
					{entry}
					label={startText(entry)}
					time="{newDay ? `${calendarDayText(entry.startTime)}, ` : ''}{formatClock({
						time: entry.startTime
					})} – {formatClock({ time: entry.endTime })}"
					onclick={() => open(entry)}
				/>
			{/if}
			{#if view.following.length > 0}
				<ScheduleTimeline
					timeline={{ current: [], upcoming: view.following }}
					onEntryClick={open}
				/>
			{/if}
			<a
				class="btn btn-ghost btn-sm text-primary -ml-3 self-start"
				href={resolve('/(authenticated)/dashboard/[conferenceId]/calendar', { conferenceId })}
			>
				{m.calendarFullSchedule()}
				<i aria-hidden="true" class="ph-duotone ph-arrow-right"></i>
			</a>
		</div>
	</DashboardSection>

	<CalendarEntryDrawer
		bind:open={() => drawerOpen && selected !== null, (value) => (drawerOpen = value)}
		entry={selected}
		track={entryTrackSummary({ day: selectedDay, entry: selected })}
		dayName={selectedDay?.name}
		dayDate={selectedDay?.date}
	/>
{/if}
