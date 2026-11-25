<script lang="ts">
	import { entriesForSeat, timelineOf, type Seat } from '#lib/components/calendar/calendarNow';
	import ScheduleTimeline from '#lib/components/calendar/ScheduleTimeline.svelte';
	import { createMinuteClock } from '#lib/components/calendar/minuteClock.svelte.js';
	import { personalCalendarDays } from '#lib/components/calendar/personalCalendar';
	import { fetchPersonalSchedule } from './personalSchedule';
	import { m } from '#lib/paraglide/messages';
	import Section from '../ui/Section.svelte';

	/** Where the person has to be now and next, on their own track. Nothing once there is nothing left. */
	interface Props {
		userId: string;
		conferenceId: string;
		seat: Seat;
		class?: string;
	}

	let { userId, conferenceId, seat, class: className }: Props = $props();

	const [conference, calendarDays, answers] = $derived(
		await fetchPersonalSchedule({ conferenceId, userId })
	);

	const clock = createMinuteClock();

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
			now: new Date(clock.time),
			count: 3
		})
	);
</script>

{#if timeline.current.length > 0 || timeline.upcoming.length > 0}
	<div class={className}>
		<Section icon="clock" title={m.calendarNextEntries()}>
			<div class="pl-9">
				<ScheduleTimeline {timeline} />
			</div>
		</Section>
	</div>
{/if}
