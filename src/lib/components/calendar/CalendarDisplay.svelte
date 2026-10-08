<script lang="ts">
	import type { CalendarDay as Day, CalendarEntry as Entry } from './calendarTypes';
	import CalendarTrackFilter from './CalendarTrackFilter.svelte';
	import CalendarDayView from './CalendarDayView.svelte';
	import CalendarEntryDrawer from './CalendarEntryDrawer.svelte';
	import { entryTrackSummary, todayIndex } from './calendarDisplay';

	interface Props {
		days: Day[];
		timezone?: string;
		onEditEntry?: (entryId: string) => void;
		onEditPlace?: (placeId: string) => void;
	}

	let { days, timezone = 'UTC', onEditEntry, onEditPlace }: Props = $props();

	// svelte-ignore state_referenced_locally -- only the day shown first depends on it
	let selectedDayIndex = $state(todayIndex(days, timezone));
	let filterTrackId = $state<string | null>(null);

	let selectedDay = $derived(days[selectedDayIndex]);
	let selectedDayTracks = $derived(selectedDay?.tracks ?? []);

	// Drawer state
	let drawerOpen = $state(false);
	let selectedEntry = $state<Entry | null>(null);
	let selectedDayForDrawer = $state<Day | null>(null);

	let selectedTrack = $derived(entryTrackSummary(selectedDayForDrawer, selectedEntry));

	function handleEntryClick(entry: Entry, day: Day) {
		selectedEntry = entry;
		selectedDayForDrawer = day;
		drawerOpen = true;
	}

	// Reset track filter when switching days since tracks differ
	$effect(() => {
		void selectedDayIndex;
		filterTrackId = null;
	});
</script>

{#snippet dayTabs()}
	<div role="tablist" class="tabs tabs-border mb-4">
		{#each days as day, i (day.id)}
			<button
				role="tab"
				class="tab {i === selectedDayIndex ? 'tab-active' : ''}"
				onclick={() => (selectedDayIndex = i)}
			>
				{day.name}
			</button>
		{/each}
	</div>
{/snippet}

{#if days.length > 0}
	<!-- Small screens: tabs + single day -->
	<div class="3xl:hidden">
		{#if days.length > 1}
			{@render dayTabs()}
		{/if}

		{#if selectedDayTracks.length > 1}
			<CalendarTrackFilter tracks={selectedDayTracks} bind:filterTrackId />
		{/if}

		{#if selectedDay}
			<CalendarDayView
				dayName={selectedDay.name}
				date={selectedDay.date}
				tracks={selectedDay.tracks}
				entries={selectedDay.entries}
				{filterTrackId}
				{timezone}
				onEntryClick={(entry) => handleEntryClick(entry, selectedDay)}
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
				{filterTrackId}
				{timezone}
				onEntryClick={(entry) => handleEntryClick(entry, day)}
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
