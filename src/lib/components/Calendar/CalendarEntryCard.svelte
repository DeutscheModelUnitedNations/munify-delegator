<script lang="ts">
	import type { CalendarEntryColor } from '@prisma/client';
	import { getColorConfig } from './calendarColors';

	interface Props {
		name: string;
		description?: string | null;
		fontAwesomeIcon?: string | null;
		color: CalendarEntryColor;
		startTime: Date;
		endTime: Date;
		place?: { name: string } | null;
		room?: string | null;
		compact?: boolean;
		onclick?: () => void;
	}

	let {
		name,
		description,
		fontAwesomeIcon,
		color,
		startTime,
		endTime,
		place,
		room,
		compact = false,
		onclick
	}: Props = $props();

	let colorConfig = $derived(getColorConfig(color));

	let timeLabel = $derived(
		`${startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – ${endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
	);

	let locationLabel = $derived([place?.name, room].filter(Boolean).join(' · '));
</script>

<button
	type="button"
	class="{colorConfig.bg} {colorConfig.border} flex h-full w-full flex-col overflow-hidden rounded border-l-4 px-2 py-1 text-left transition-opacity hover:opacity-80"
	{onclick}
	disabled={!onclick}
>
	{#if compact}
		<div class="flex items-center gap-1 truncate text-[11px] font-medium leading-tight">
			{#if fontAwesomeIcon}
				<i class="fa-duotone fa-{fontAwesomeIcon} {colorConfig.text} shrink-0 text-[9px]"></i>
			{/if}
			<span class="truncate">{name}</span>
			<span class="text-base-content/50 shrink-0">{timeLabel}</span>
		</div>
		{#if locationLabel}
			<span class="text-base-content/50 truncate text-[10px] leading-tight">
				<i class="fa-duotone fa-location-dot text-[8px]"></i>
				{locationLabel}
			</span>
		{/if}
	{:else}
		<div class="flex items-center gap-1.5">
			{#if fontAwesomeIcon}
				<i class="fa-duotone fa-{fontAwesomeIcon} {colorConfig.text} shrink-0 text-sm"></i>
			{/if}
			<span class="truncate text-sm font-semibold">{name}</span>
		</div>
		<span class="text-base-content/60 text-xs">{timeLabel}</span>
		{#if locationLabel}
			<span class="text-base-content/50 truncate text-xs">
				<i class="fa-duotone fa-location-dot text-[10px]"></i>
				{locationLabel}
			</span>
		{/if}
		{#if description}
			<span class="text-base-content/50 mt-0.5 line-clamp-2 text-xs">{description}</span>
		{/if}
	{/if}
</button>
