<script lang="ts">
	import { entriesForSeat, timelineOf, type Seat } from '#lib/components/calendar/calendarNow';
	import { personalCalendarDays } from '#lib/components/calendar/personalCalendar';
	import { fetchPersonalSchedule } from '../sections/personalSchedule';
	import { calendarDayText } from '#lib/helpers/calendarDay';
	import { formatClock } from '#lib/helpers/formatClock';
	import { m } from '#lib/paraglide/messages';

	/** Where the person has to be now and next, on their own track. */
	interface Props {
		userId: string;
		conferenceId: string;
		seat: Seat;
	}

	let { userId, conferenceId, seat }: Props = $props();

	const [conference, calendarDays, answers] = $derived(
		await fetchPersonalSchedule({ conferenceId, userId })
	);

	let now = $state(new Date());
	$effect(() => {
		const interval = setInterval(() => (now = new Date()), 60_000);
		return () => clearInterval(interval);
	});

	const days = $derived(
		personalCalendarDays({
			days: calendarDays,
			pickedOptionIds: answers.map((answer) => answer.option.id)
		})
	);
	const timeline = $derived(
		timelineOf({
			entries: entriesForSeat({ days, seat }),
			timezone: conference.timezone,
			now,
			count: 3
		})
	);

	const placeOf = (entry: { place?: { name: string } | null; room?: string | null }) =>
		[entry.place?.name, entry.room].filter(Boolean).join(', ');
</script>

{#snippet line(entry: { name: string } & Parameters<typeof placeOf>[0], time: string)}
	<li class="flex items-baseline gap-2 py-1">
		<span class="shrink-0 font-mono text-xs">{time}</span>
		<span class="min-w-0 flex-1">{entry.name}</span>
		<span class="text-base-content/60 max-w-32 truncate" title={placeOf(entry)}>
			{placeOf(entry)}
		</span>
	</li>
{/snippet}

{#if !timeline.current && timeline.upcoming.length === 0}
	<p class="text-base-content/60 italic">{m.userCardNoNextEntries()}</p>
{:else}
	<ul class="divide-base-300 flex flex-col divide-y">
		{#if timeline.current}
			{@render line(timeline.current, m.calendarNow())}
		{/if}
		{#each timeline.upcoming as { entry, newDay } (entry.id)}
			{#if newDay}
				<li class="text-base-content/60 py-1 text-xs">{calendarDayText(entry.startTime)}</li>
			{/if}
			{@render line(entry, formatClock({ time: entry.startTime }))}
		{/each}
	</ul>
{/if}
