<script lang="ts">
	import type { CalendarEntryColor } from '@prisma/client';
	import CalendarDayView from './CalendarDayView.svelte';
	import CalendarEntryDrawer from './CalendarEntryDrawer.svelte';
	import { m } from '$lib/paraglide/messages';

	interface Track {
		id: string;
		name: string;
		description?: string | null;
		sortOrder: number;
	}

	interface Entry {
		id: string;
		startTime: Date;
		endTime: Date;
		name: string;
		description?: string | null;
		fontAwesomeIcon?: string | null;
		color: CalendarEntryColor;
		place?: {
			id: string;
			name: string;
			address?: string | null;
			latitude?: number | null;
			longitude?: number | null;
			directions?: string | null;
			info?: string | null;
			websiteUrl?: string | null;
			sitePlanDataURL?: string | null;
		} | null;
		room?: string | null;
		calendarTrackId?: string | null;
	}

	interface Day {
		id: string;
		name: string;
		date: Date;
		sortOrder: number;
		tracks: Track[];
		entries: Entry[];
	}

	interface Props {
		days: Day[];
	}

	let { days }: Props = $props();

	function getTodayIndex() {
		const today = new Date();
		const idx = days.findIndex((d) => {
			const dd = new Date(d.date);
			return (
				dd.getFullYear() === today.getFullYear() &&
				dd.getMonth() === today.getMonth() &&
				dd.getDate() === today.getDate()
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
		selectedDayIndex;
		filterTrackId = null;
	});
</script>

{#if days.length > 0}
	<!-- Small screens: tabs + single day -->
	<div class="3xl:hidden">
		{#if days.length > 1}
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
		{/if}

		{#if selectedDayTracks.length > 1}
			<div
				class="border-base-300 bg-base-200/50 mb-4 flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2"
			>
				<span class="text-sm font-medium">{m.calendarTrack()}:</span>
				<div class="flex flex-wrap gap-1">
					<button
						class="btn btn-xs {filterTrackId === null ? 'btn-primary' : 'btn-ghost'}"
						onclick={() => (filterTrackId = null)}
					>
						{m.calendarAllTracks()}
					</button>
					{#each selectedDayTracks as track (track.id)}
						{#if track.description}
							<div class="tooltip" data-tip={track.description}>
								<button
									class="btn btn-xs {filterTrackId === track.id ? 'btn-primary' : 'btn-ghost'}"
									onclick={() => (filterTrackId = track.id)}
								>
									{track.name}
								</button>
							</div>
						{:else}
							<button
								class="btn btn-xs {filterTrackId === track.id ? 'btn-primary' : 'btn-ghost'}"
								onclick={() => (filterTrackId = track.id)}
							>
								{track.name}
							</button>
						{/if}
					{/each}
				</div>
			</div>
		{/if}

		{#if selectedDay}
			<CalendarDayView
				dayName={selectedDay.name}
				date={selectedDay.date}
				tracks={selectedDay.tracks}
				entries={selectedDay.entries}
				{filterTrackId}
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
	/>
{/if}
