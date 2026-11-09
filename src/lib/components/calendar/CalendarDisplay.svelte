<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { CalendarDay as Day, CalendarEntry as Entry } from './calendarTypes';
	import CalendarTrackFilter from './CalendarTrackFilter.svelte';
	import CalendarDayView from './CalendarDayView.svelte';
	import CalendarEntryDrawer from './CalendarEntryDrawer.svelte';
	import { entryTrackSummary, todayIndex } from './calendarDisplay';

	interface Props {
		days: Day[];
		/** Shown at the start of the row the day and track selection is in */
		heading?: Snippet;
		timezone?: string;
		/** Tracks to preselect: on each day, the first of them the day has */
		ownTrackIds?: readonly string[];
		onEditEntry?: (entryId: string) => void;
		onEditPlace?: (placeId: string) => void;
	}

	let {
		days,
		timezone = 'UTC',
		heading,
		ownTrackIds = [],
		onEditEntry,
		onEditPlace
	}: Props = $props();

	/** The track a day opens on: the person's own when the day has it, else all of them */
	const openingTrackOf = (day: Day | undefined) =>
		day?.tracks.find((track) => ownTrackIds.includes(track.id))?.id ?? null;

	// Only the day shown first depends on these props, so reading them once is intended
	// svelte-ignore state_referenced_locally
	let selectedDayIndex = $state(todayIndex({ days, timezone }));
	// svelte-ignore state_referenced_locally
	let filterTrackId = $state<string | null>(openingTrackOf(days[selectedDayIndex]));

	let selectedDay = $derived(days[selectedDayIndex]);
	let selectedDayTracks = $derived(selectedDay?.tracks ?? []);

	// Drawer state
	let drawerOpen = $state(false);
	let selectedEntry = $state<Entry | null>(null);
	let selectedDayForDrawer = $state<Day | null>(null);

	let selectedTrack = $derived(
		entryTrackSummary({ day: selectedDayForDrawer, entry: selectedEntry })
	);

	function handleEntryClick({ entry, day }: { entry: Entry; day: Day }) {
		selectedEntry = entry;
		selectedDayForDrawer = day;
		drawerOpen = true;
	}

	// Tracks differ between days, so switching days starts over with the day's own track
	function selectDay(index: number) {
		selectedDayIndex = index;
		filterTrackId = openingTrackOf(days[index]);
	}
</script>

{#snippet dayTabs()}
	<div role="tablist" class="tabs tabs-border">
		{#each days as day, i (day.id)}
			<button
				role="tab"
				class="tab {i === selectedDayIndex ? 'tab-active' : ''}"
				aria-selected={i === selectedDayIndex}
				onclick={() => selectDay(i)}
			>
				{day.name}
			</button>
		{/each}
	</div>
{/snippet}

{#if days.length > 0}
	<!-- A heading, when given, and the selection (the days, then the tracks) share one row, wrapping
	onto further rows when there is no room. All days show at once on a very large screen, where
	there is nothing to select. -->
	<div class="mb-4 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
		{@render heading?.()}
		<div class="3xl:hidden flex flex-wrap items-center gap-x-6 gap-y-2">
			{#if days.length > 1}
				{@render dayTabs()}
			{/if}

			{#if selectedDayTracks.length > 1}
				<CalendarTrackFilter tracks={selectedDayTracks} bind:filterTrackId />
			{/if}
		</div>
	</div>

	<!-- Small screens: single day -->
	<div class="3xl:hidden">
		{#if selectedDay}
			<CalendarDayView
				dayName={selectedDay.name}
				date={selectedDay.date}
				tracks={selectedDay.tracks}
				entries={selectedDay.entries}
				{filterTrackId}
				{timezone}
				onEntryClick={(entry) => handleEntryClick({ entry, day: selectedDay })}
			/>
		{/if}
	</div>

	<!-- Large screens: all days side-by-side -->
	<div class="hidden 3xl:grid 3xl:gap-4" style="grid-template-columns: repeat({days.length}, 1fr);">
		{#each days as day (day.id)}
			<CalendarDayView
				dayName={day.name}
				date={day.date}
				tracks={day.tracks}
				entries={day.entries}
				filterTrackId={day.tracks.some((track) => track.id === filterTrackId)
					? filterTrackId
					: null}
				{timezone}
				minTrackWidth="0"
				onEntryClick={(entry) => handleEntryClick({ entry, day })}
			/>
		{/each}
	</div>

	<CalendarEntryDrawer
		bind:open={drawerOpen}
		entry={selectedEntry}
		track={selectedTrack}
		dayName={selectedDayForDrawer?.name}
		dayDate={selectedDayForDrawer?.date}
		{onEditEntry}
		{onEditPlace}
	/>
{/if}
