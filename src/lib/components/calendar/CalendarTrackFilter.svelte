<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import OptionalTooltip from '$lib/components/OptionalTooltip.svelte';
	import type { CalendarTrack } from './calendarTypes';

	interface Props {
		tracks: CalendarTrack[];
		/** The selected track, `null` for all of them. */
		filterTrackId: string | null;
	}

	let { tracks, filterTrackId = $bindable() }: Props = $props();
</script>

{#snippet filterButton(trackId: string | null, label: string)}
	<button
		class="btn btn-xs {filterTrackId === trackId ? 'btn-primary' : 'btn-ghost'}"
		onclick={() => (filterTrackId = trackId)}
	>
		{label}
	</button>
{/snippet}

<div
	class="border-base-300 bg-base-200/50 mb-4 flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2"
>
	<span class="text-sm font-medium">{m.calendarTrack()}:</span>
	<div class="flex flex-wrap gap-1">
		{@render filterButton(null, m.calendarAllTracks())}
		{#each tracks as track (track.id)}
			<OptionalTooltip tip={track.description}>
				{@render filterButton(track.id, track.name)}
			</OptionalTooltip>
		{/each}
	</div>
</div>
