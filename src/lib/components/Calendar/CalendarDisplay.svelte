<script lang="ts">
	import type { CalendarEntryColor } from '@prisma/client';
	import CalendarDayView from './CalendarDayView.svelte';
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
		place?: { name: string } | null;
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

	let selectedDayIndex = $state(0);
	let filterTrackId = $state<string | null>(null);

	let selectedDay = $derived(days[selectedDayIndex]);
	let selectedDayTracks = $derived(selectedDay?.tracks ?? []);

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
			/>
		{/each}
	</div>
{/if}
