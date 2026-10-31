<!--
	@component
	A compact timeline for the schedule's card on the dashboard: a "now" icon, then an arrow to each
	of the next thing to start on the signed-in person's track, with their start and end, and
	a marker wherever another day begins. Shows nothing for a visitor who is not signed in, and
	when nothing is left. Ticks along every minute so it stays true.
-->
<script lang="ts">
	import { client } from '#lib/api/rumbleClient/client';
	import { fetchCalendarDays } from '#lib/api/calendarDays';
	import { fetchMyParticipation } from '#lib/api/myConferenceParticipation';
	import { entriesForSeat, seatOf, timelineOf } from '#lib/components/calendar/calendarNow';
	import { formatClock } from '#lib/helpers/formatClock';
	import { getLocale } from '#lib/paraglide/runtime';
	import { m } from '#lib/paraglide/messages';

	let { conferenceId }: { conferenceId: string } = $props();

	const [conference, days, participation] = $derived(
		await Promise.all([
			client.liveQuery.conference({ __args: { id: conferenceId }, timezone: true }),
			fetchCalendarDays(conferenceId),
			fetchMyParticipation(conferenceId)
		])
	);

	// Whom the schedule's tracks are for: the person's committee and role. Read into plain ids
	// once, so the timeline does not subscribe to every field it touches.
	const seat = $derived(seatOf(participation));

	let now = $state(new Date());
	$effect(() => {
		const interval = setInterval(() => (now = new Date()), 60_000);
		return () => clearInterval(interval);
	});

	const timeline = $derived(
		timelineOf({
			entries: entriesForSeat({ days, seat }),
			timezone: conference.timezone,
			now,
			count: 1
		})
	);

	// Calendar times are UTC wall-clock times, so the day is read in UTC as well
	const dayLabel = (date: Date) =>
		new Intl.DateTimeFormat(getLocale(), {
			weekday: 'long',
			day: 'numeric',
			month: 'long',
			timeZone: 'UTC'
		}).format(date);
</script>

{#snippet arrow()}
	<li class="flex shrink-0 items-center" aria-hidden="true">
		<i class="fa-sharp-duotone fa-solid fa-arrow-right text-base-content/40 text-xs"></i>
	</li>
{/snippet}

<!-- Only for someone signed in: it is their track -->
{#if participation && (timeline.current || timeline.upcoming.length > 0)}
	<ol class="mt-2 flex flex-col gap-1">
		<li class="flex items-center gap-2 text-sm">
			<i
				class="fa-sharp-duotone fa-solid fa-circle-play text-primary w-4 text-center"
				title={m.calendarNow()}
				aria-hidden="true"
			></i>
			<span class="sr-only">{m.calendarNow()}</span>
			{#if timeline.current}
				<span class="min-w-0 truncate">
					<span class="font-medium">{timeline.current.name}</span>
					<span class="text-base-content/60">
						· {m.calendarUntil({ time: formatClock({ time: timeline.current.endTime }) })}
					</span>
				</span>
			{:else}
				<span class="text-base-content/60">–</span>
			{/if}
		</li>
		{#each timeline.upcoming as { entry, newDay } (entry.id)}
			{#if newDay}
				<li class="text-base-content/60 flex items-center gap-2 text-xs">
					<i class="fa-sharp-duotone fa-solid fa-calendar-day w-4 text-center" aria-hidden="true"
					></i>
					<span>{dayLabel(entry.startTime)}</span>
					<span class="border-base-content/15 flex-1 border-t"></span>
				</li>
			{/if}
			<li class="flex items-center gap-2 text-sm">
				<i
					class="fa-sharp-duotone fa-solid fa-clock text-primary w-4 text-center"
					aria-hidden="true"
				></i>
				<span class="min-w-0 truncate">
					<span class="font-medium">{entry.name}</span>
					<span class="text-base-content/60">
						· {formatClock({ time: entry.startTime })} – {formatClock({ time: entry.endTime })}
					</span>
				</span>
			</li>
		{/each}
	</ol>
{/if}
