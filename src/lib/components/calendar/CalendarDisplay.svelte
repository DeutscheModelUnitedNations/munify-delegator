<script lang="ts">
	import type { CalendarDay as Day, CalendarEntry as Entry } from './calendarTypes';
	import CalendarTrackFilter from './CalendarTrackFilter.svelte';
	import CalendarDayView from './CalendarDayView.svelte';
	import CalendarEntryDrawer from './CalendarEntryDrawer.svelte';

	interface Props {
		days: Day[];
		timezone?: string;
		onEditEntry?: (entryId: string) => void;
		onEditPlace?: (placeId: string) => void;
	}

	let { days, timezone = 'UTC', onEditEntry, onEditPlace }: Props = $props();

	function getTodayIndex() {
		const now = new Date();
		const fmt = new Intl.DateTimeFormat('en-US', {
			timeZone: timezone,
			year: 'numeric',
			month: 'numeric',
			day: 'numeric'
		});
		const parts = fmt.formatToParts(now);
		const todayYear = Number(parts.find((p) => p.type === 'year')?.value);
		const todayMonth = Number(parts.find((p) => p.type === 'month')?.value) - 1;
		const todayDay = Number(parts.find((p) => p.type === 'day')?.value);

		const idx = days.findIndex((d) => {
			const dd = new Date(d.date);
			return (
				dd.getUTCFullYear() === todayYear &&
				dd.getUTCMonth() === todayMonth &&
				dd.getUTCDate() === todayDay
			);
		});
		return idx >= 0 ? idx : 0;
	}

	let selectedDayIndex = $state(getTodayIndex());
	let filterTrackId = $state<string | null>(null);

	let selectedDay = $derived(days[selectedDayIndex]);
	let selectedDayTracks = $derived(selectedDay?.tracks ?? []);

	// Drawer state
	let drawerOpen = $state(false);
	let selectedEntry = $state<Entry | null>(null);
	let selectedDayForDrawer = $state<Day | null>(null);

	let selectedTrack = $derived(
		selectedEntry?.calendarTrackId && selectedDayForDrawer
			? (selectedDayForDrawer.tracks.find((t) => t.id === selectedEntry?.calendarTrackId) ?? null)
			: null
	);

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
