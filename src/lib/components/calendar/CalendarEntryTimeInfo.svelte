<script lang="ts">
	import type { CalendarEntry, CalendarTrack } from './calendarTypes';

	interface Props {
		entry: Pick<CalendarEntry, 'startTime' | 'endTime'>;
		track?: Pick<CalendarTrack, 'name' | 'description'> | null;
		dayName?: string;
		dayDate?: Date | null;
	}

	let { entry, track = null, dayName, dayDate = null }: Props = $props();

	const formatTime = (date: Date) =>
		new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });

	let timeLabel = $derived(`${formatTime(entry.startTime)} – ${formatTime(entry.endTime)}`);

	let formattedDate = $derived(
		dayDate
			? new Date(dayDate).toLocaleDateString(undefined, {
					weekday: 'long',
					day: '2-digit',
					month: '2-digit',
					year: 'numeric',
					timeZone: 'UTC'
				})
			: null
	);

	let dayLabel = $derived([dayName, formattedDate].filter(Boolean).join(' · '));
</script>

<div class="alert alert-soft text-base-content">
	<i class="fa-sharp-duotone fa-solid fa-clock fa-fw"></i>
	<div>
		<div class="font-semibold">{timeLabel}</div>
		<div class="text-xs">{dayLabel}</div>
		{#if track}
			<div class="mt-1 text-xs">
				<i class="fa-sharp-duotone fa-solid fa-layer-group mr-1"></i>
				{track.name}
				{#if track.description}
					&middot; {track.description}
				{/if}
			</div>
		{/if}
	</div>
</div>
