<script lang="ts">
	import type { CalendarEntryColor } from '@prisma/client';
	import CalendarEntryCard from './CalendarEntryCard.svelte';
	import CalendarTimeMarker from './CalendarTimeMarker.svelte';

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

	interface Props {
		dayName: string;
		date?: Date | null;
		tracks: Track[];
		entries: Entry[];
		filterTrackId?: string | null;
		hourHeight?: number;
	}

	let {
		dayName,
		date = null,
		tracks,
		entries,
		filterTrackId = null,
		hourHeight = 120
	}: Props = $props();

	let formattedDate = $derived(
		date
			? new Date(date).toLocaleDateString(undefined, {
					weekday: 'long',
					day: '2-digit',
					month: '2-digit',
					year: 'numeric'
				})
			: null
	);

	let visibleTracks = $derived(
		filterTrackId ? tracks.filter((t) => t.id === filterTrackId) : tracks
	);

	let visibleEntries = $derived(
		filterTrackId
			? entries.filter((e) => e.calendarTrackId === filterTrackId || !e.calendarTrackId)
			: entries
	);

	let timeRange = $derived.by(() => {
		if (entries.length === 0) return { startHour: 8, endHour: 18 };
		let earliest = Infinity;
		let latest = -Infinity;
		for (const entry of entries) {
			const start = new Date(entry.startTime);
			const end = new Date(entry.endTime);
			const startH = start.getHours() + start.getMinutes() / 60;
			const endH = end.getHours() + end.getMinutes() / 60;
			if (startH < earliest) earliest = startH;
			if (endH > latest) latest = endH;
		}
		return { startHour: Math.floor(earliest), endHour: Math.ceil(latest) };
	});

	let hours = $derived(
		Array.from(
			{ length: timeRange.endHour - timeRange.startHour },
			(_, i) => timeRange.startHour + i
		)
	);

	let totalHeight = $derived(hours.length * hourHeight);

	function getEntryStyle(entry: Entry): string {
		const start = new Date(entry.startTime);
		const end = new Date(entry.endTime);
		const startH = start.getHours() + start.getMinutes() / 60;
		const endH = end.getHours() + end.getMinutes() / 60;
		const top = (startH - timeRange.startHour) * hourHeight;
		const height = (endH - startH) * hourHeight;
		return `top: ${top}px; height: ${height}px;`;
	}

	function getColumnForEntry(entry: Entry): { start: number; span: number } {
		if (!entry.calendarTrackId) {
			return { start: 1, span: visibleTracks.length };
		}
		const idx = visibleTracks.findIndex((t) => t.id === entry.calendarTrackId);
		if (idx === -1) return { start: 1, span: visibleTracks.length };
		return { start: idx + 1, span: 1 };
	}

	function isCompact(entry: Entry): boolean {
		const start = new Date(entry.startTime);
		const end = new Date(entry.endTime);
		const durationMinutes = (end.getTime() - start.getTime()) / 60_000;
		return durationMinutes <= 30;
	}
</script>

<div class="flex flex-col">
	<div class="mb-2 text-center">
		<h3 class="text-sm font-bold">{dayName}</h3>
		{#if formattedDate}
			<p class="text-base-content/60 text-xs">{formattedDate}</p>
		{/if}
	</div>

	{#if visibleTracks.length > 0}
		<div
			class="mb-2 grid gap-px"
			style="grid-template-columns: 3.5rem repeat({visibleTracks.length}, minmax(0, 1fr));"
		>
			<div></div>
			{#each visibleTracks as track (track.id)}
				<div
					class="bg-base-200 truncate rounded-t px-2 py-2 text-center text-xs font-medium"
					title={track.name}
				>
					{track.name}
				</div>
			{/each}
		</div>
	{/if}

	<div
		class="grid"
		style="grid-template-columns: 3.5rem repeat({Math.max(
			visibleTracks.length,
			1
		)}, minmax(0, 1fr));"
	>
		<!-- Time gutter -->
		<div class="relative" style="height: {totalHeight}px;">
			{#each hours as hour (hour)}
				<div
					class="text-base-content/40 absolute right-2 text-xs leading-none"
					style="top: {(hour - timeRange.startHour) * hourHeight}px; transform: translateY(-50%);"
				>
					{hour.toString().padStart(2, '0')}:00
				</div>
			{/each}
		</div>

		<!-- Entries area -->
		<div
			class="relative"
			style="height: {totalHeight}px; grid-column: 2 / {Math.max(visibleTracks.length, 1) + 2};"
		>
			<!-- Gridlines -->
			{#each hours as hour (hour)}
				<div
					class="border-base-200 absolute right-0 left-0 border-t"
					style="top: {(hour - timeRange.startHour) * hourHeight}px;"
				></div>
				<!-- 15-minute dashed gridlines -->
				{#each [0.25, 0.5, 0.75] as fraction}
					<div
						class="border-base-200/40 absolute right-0 left-0 border-t border-dashed"
						style="top: {(hour - timeRange.startHour + fraction) * hourHeight}px;"
					></div>
				{/each}
			{/each}

			<!-- Vertical track dividers -->
			{#each { length: Math.max(visibleTracks.length, 1) - 1 } as _, i}
				<div
					class="border-base-200/40 absolute top-0 bottom-0 border-l border-dashed"
					style="left: calc((100% / {Math.max(visibleTracks.length, 1)}) * {i + 1});"
				></div>
			{/each}

			<!-- Entry cards -->
			<div
				class="absolute inset-0 grid"
				style="grid-template-columns: repeat({Math.max(visibleTracks.length, 1)}, minmax(0, 1fr));"
			>
				{#each visibleEntries as entry (entry.id)}
					{@const col = getColumnForEntry(entry)}
					<div
						class="absolute px-0.5 pb-px"
						style="{getEntryStyle(entry)} left: calc((100% / {Math.max(
							visibleTracks.length,
							1
						)}) * {col.start - 1}); width: calc((100% / {Math.max(
							visibleTracks.length,
							1
						)}) * {col.span});"
					>
						<CalendarEntryCard
							name={entry.name}
							description={entry.description}
							fontAwesomeIcon={entry.fontAwesomeIcon}
							color={entry.color}
							startTime={new Date(entry.startTime)}
							endTime={new Date(entry.endTime)}
							place={entry.place}
							room={entry.room}
							compact={isCompact(entry)}
						/>
					</div>
				{/each}
			</div>

			<!-- Time marker -->
			<CalendarTimeMarker
				startHour={timeRange.startHour}
				endHour={timeRange.endHour}
				{hourHeight}
			/>
		</div>
	</div>
</div>
