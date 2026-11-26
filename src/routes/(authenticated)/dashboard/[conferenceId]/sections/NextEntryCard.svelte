<script lang="ts">
	import { getColorConfig } from '#lib/components/calendar/calendarColors';
	import { placeLine } from '#lib/components/calendar/calendarNow';
	import type { CalendarEntry } from '#lib/components/calendar/calendarTypes';

	/** The entry that matters most right now, in the colours the calendar shows it in. */
	interface Props {
		entry: Pick<CalendarEntry, 'name' | 'icon' | 'color' | 'place' | 'room'>;
		/** That it is on, or how long until it starts */
		label: string;
		time: string;
		running?: boolean;
		onclick: () => void;
	}

	let { entry, label, time, running = false, onclick }: Props = $props();

	const colors = $derived(getColorConfig(entry.color));
	const place = $derived(placeLine(entry));
</script>

<button
	type="button"
	class="{colors.bg} {colors.border} rounded-field flex w-full cursor-pointer flex-col gap-1 border-l-4 px-4 py-3 text-left transition-opacity hover:opacity-80"
	{onclick}
>
	<span class="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
		<span class="badge badge-sm {running ? 'badge-success' : 'badge-neutral'}">{label}</span>
		<span class="text-base-content/80 tabular-nums">{time}</span>
	</span>
	<span class="flex items-center gap-2 text-lg font-semibold">
		{#if entry.icon}
			<i aria-hidden="true" class="ph-duotone ph-{entry.icon} {colors.text}"></i>
		{/if}
		<span class="min-w-0 break-words">{entry.name}</span>
	</span>
	{#if place}
		<span class="text-base-content/80 text-sm">
			<i aria-hidden="true" class="ph-duotone ph-map-pin"></i>
			{place}
		</span>
	{/if}
</button>
