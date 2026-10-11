<script lang="ts">
	import { formatClockMinutes } from '$lib/helpers/formatClock';
	import type { CalendarentrycolorEnum } from '$lib/api/rumbleClient/client';
	import { getColorConfig } from '$lib/components/calendar/calendarColors';
	import { m } from '$lib/paraglide/messages';

	/**
	 * An entry in the calendar editor. The editor owns the pointer handling (it needs the pointer
	 * to stay captured while the card changes columns); this draws the card and its four resize
	 * edges (top and bottom for the time, left and right for the tracks), and the keyboard reaches the same actions.
	 */
	interface Props {
		id: string;
		name: string;
		fontAwesomeIcon: string | null;
		color: CalendarentrycolorEnum;
		start: number;
		end: number;
		location: string;
		overlapping: boolean;
		dragging: boolean;
		/** The row/column geometry as inline style (position, size) */
		style: string;
	}

	let {
		id,
		name,
		fontAwesomeIcon,
		color,
		start,
		end,
		location,
		overlapping,
		dragging,
		style
	}: Props = $props();

	const config = $derived(getColorConfig(color));
	const compact = $derived(end - start <= 30);
	const timeLabel = $derived(`${formatClockMinutes(start)} – ${formatClockMinutes(end)}`);
</script>

<div
	role="button"
	tabindex="0"
	data-entry-id={id}
	aria-label="{name}, {timeLabel}"
	class="{config.bg} {config.border} absolute touch-none overflow-hidden rounded-field border-l-4 bg-clip-padding px-2 py-0.5 text-left select-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary
		{dragging ? 'z-30 cursor-grabbing opacity-90 shadow-xl' : 'z-10 cursor-grab hover:brightness-95'}
		{overlapping ? 'ring-warning ring-2' : ''}"
	{style}
>
	<div data-resize="start" class="absolute inset-x-0 top-0 z-10 h-2 cursor-ns-resize"></div>
	<div data-resize="left" class="absolute inset-y-0 left-0 z-10 w-3 cursor-ew-resize"></div>
	<div data-resize="right" class="absolute inset-y-0 right-0 z-10 w-3 cursor-ew-resize"></div>
	<div class="pointer-events-none flex items-start gap-1.5 leading-tight">
		{#if overlapping}
			<i
				class="fa-sharp-duotone fa-solid fa-triangle-exclamation text-warning mt-0.5 shrink-0 text-xs"
				title={m.calendarEntryOverlap()}
			></i>
		{/if}
		{#if fontAwesomeIcon}
			<i
				class="fa-sharp-duotone fa-solid fa-{fontAwesomeIcon} {config.text} mt-0.5 shrink-0 text-xs"
			></i>
		{/if}
		<span class="truncate text-xs font-semibold">{name}</span>
		{#if compact}
			<span class="text-base-content/60 shrink-0 text-[11px]">{timeLabel}</span>
		{/if}
	</div>
	{#if !compact}
		<div class="text-base-content/60 pointer-events-none text-[11px] leading-tight">
			{timeLabel}
		</div>
		{#if location}
			<div class="text-base-content/50 pointer-events-none truncate text-[11px] leading-tight">
				<i class="fa-sharp-duotone fa-solid fa-location-dot text-[9px]"></i>
				{location}
			</div>
		{/if}
	{/if}
	<div data-resize="end" class="absolute inset-x-0 bottom-0 z-10 h-2 cursor-ns-resize"></div>
</div>
