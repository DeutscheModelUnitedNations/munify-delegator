<!--
	@component
	What is on now among `entries`, or how long until the next thing starts, then what comes after
	it, each opening the entry's drawer. Follows the clock. Renders its content inside `frame` while
	something is on or left, `empty` (or nothing) otherwise: the participant's next entries and the
	team overview's "now & next" widget frame it each their own way.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import CalendarEntryDrawer from '#lib/components/calendar/CalendarEntryDrawer.svelte';
	import ScheduleTimeline from '#lib/components/calendar/ScheduleTimeline.svelte';
	import { entryTrackSummary } from '#lib/components/calendar/calendarDisplay';
	import { leadOfTimeline, startsIn, timelineOf } from '#lib/components/calendar/calendarNow';
	import type { CalendarDay, CalendarEntry } from '#lib/components/calendar/calendarTypes';
	import { createMinuteClock } from '#lib/components/calendar/minuteClock.svelte.js';
	import { calendarDayText } from '#lib/helpers/calendarDay';
	import { formatClock } from '#lib/helpers/formatClock';
	import { m } from '#lib/paraglide/messages';
	import { getLocale } from '#lib/paraglide/runtime';
	import NextEntryCard from './NextEntryCard.svelte';

	interface Props {
		/** The schedule's days, for the drawer's day and track */
		days: readonly CalendarDay[];
		/** The entries that concern the reader (`entriesForSeat`) */
		entries: readonly CalendarEntry[];
		timezone: string;
		/** Cards side by side on wide screens */
		columns?: boolean;
		frame: Snippet<[Snippet]>;
		empty?: Snippet;
	}

	let { days, entries, timezone, columns = false, frame, empty }: Props = $props();

	const clock = createMinuteClock();
	const now = $derived(new Date(clock.time));
	const view = $derived(
		leadOfTimeline({ timeline: timelineOf({ entries, timezone, now, count: 4 }), count: 3 })
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

{#snippet content()}
	<div class="grid gap-3 {columns ? 'md:grid-cols-2' : ''}">
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
	</div>
	{#if view.following.length > 0}
		<ScheduleTimeline timeline={{ current: [], upcoming: view.following }} onEntryClick={open} />
	{/if}
{/snippet}

{#if view.running.length > 0 || view.next}
	{@render frame(content)}

	<CalendarEntryDrawer
		bind:open={() => drawerOpen && selected !== null, (value) => (drawerOpen = value)}
		entry={selected}
		track={entryTrackSummary({ day: selectedDay, entry: selected })}
		dayName={selectedDay?.name}
		dayDate={selectedDay?.date}
	/>
{:else}
	{@render empty?.()}
{/if}
