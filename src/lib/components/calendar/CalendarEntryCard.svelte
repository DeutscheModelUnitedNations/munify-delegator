<script lang="ts">
	import { formatClock } from '#lib/helpers/formatClock';
	import type { CalendarentrycolorEnum } from '#lib/api/rumbleClient/client';
	import { getColorConfig } from './calendarColors';

	interface Props {
		name: string;
		icon?: string | null;
		color: CalendarentrycolorEnum;
		startTime: Date;
		endTime: Date;
		place?: { name: string } | null;
		room?: string | null;
		compact?: boolean;
		onclick?: () => void;
	}

	let {
		name,
		icon,
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
		`${formatClock({ time: startTime })} – ${formatClock({ time: endTime })}`
	);

	let locationLabel = $derived([place?.name, room].filter(Boolean).join(' · '));
</script>

<button
	type="button"
	class="{colorConfig.bg} {colorConfig.border} flex h-full w-full cursor-pointer flex-col overflow-hidden rounded-field border-l-4 px-2 py-1 text-left transition-opacity hover:opacity-80"
	{onclick}
	disabled={!onclick}
>
	{#if compact}
		<div class="flex items-center gap-1 truncate text-[11px] font-medium leading-tight">
			{#if icon}
				<i aria-hidden="true" class="ph-duotone ph-{icon} {colorConfig.text} shrink-0 text-[9px]"
				></i>
			{/if}
			<span class="truncate">{name}</span>
			<span class="text-base-content/50 shrink-0">{timeLabel}</span>
		</div>
		{#if locationLabel}
			<span class="text-base-content/50 truncate text-[10px] leading-tight">
				<i aria-hidden="true" class="ph-duotone ph-map-pin text-[8px]"></i>
				{locationLabel}
			</span>
		{/if}
	{:else}
		<div class="flex items-start gap-1.5">
			{#if icon}
				<i
					aria-hidden="true"
					class="ph-duotone ph-{icon} {colorConfig.text} mt-0.5 shrink-0 text-sm"
				></i>
			{/if}
			<span class="truncate text-sm font-semibold">{name}</span>
		</div>
		<span class="text-base-content/60 text-xs">{timeLabel}</span>
		{#if locationLabel}
			<span class="text-base-content/50 truncate text-xs">
				<i aria-hidden="true" class="ph-duotone ph-map-pin text-[10px]"></i>
				{locationLabel}
			</span>
		{/if}
	{/if}
</button>
