<script lang="ts">
	import type { CalendarEntryColor } from '@prisma/client';
	import CalendarDayView from './CalendarDayView.svelte';
	import { m } from '$lib/paraglide/messages';

	interface Track {
		id: string;
		name: string;
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
		place?: string | null;
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

	let allTracks = $derived(
		days.flatMap((d) => d.tracks).filter((t, i, arr) => arr.findIndex((x) => x.id === t.id) === i)
	);

	let selectedDay = $derived(days[selectedDayIndex]);
</script>

{#if days.length > 0}
	<!-- Track filter -->
	{#if allTracks.length > 1}
		<div class="mb-4 flex items-center gap-2">
			<label for="track-filter" class="text-sm font-medium">{m.calendarTrack()}:</label>
			<select id="track-filter" class="select select-sm select-bordered" bind:value={filterTrackId}>
				<option value={null}>{m.calendarAllTracks()}</option>
				{#each allTracks as track (track.id)}
					<option value={track.id}>{track.name}</option>
				{/each}
			</select>
		</div>
	{/if}

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
