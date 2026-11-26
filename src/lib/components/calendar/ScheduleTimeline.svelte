<!--
	@component
	What is on now and what comes next, one line each with the time and place, and a date wherever
	another day begins. A line is a button when `onEntryClick` is given.
-->
<script lang="ts" generics="E extends TimelineEntry">
	import { calendarDayText } from '#lib/helpers/calendarDay';
	import { formatClock } from '#lib/helpers/formatClock';
	import { m } from '#lib/paraglide/messages';
	import { placeLine, type Timeline, type TimelineEntry } from './calendarNow';

	interface Props {
		timeline: Timeline<E>;
		onEntryClick?: (entry: E) => void;
	}

	let { timeline, onEntryClick }: Props = $props();
</script>

{#snippet content(entry: E, now: boolean)}
	{@const place = placeLine(entry)}
	<span
		class="w-14 shrink-0 tabular-nums {now ? 'text-success font-bold' : 'text-base-content/70'}"
	>
		{now ? m.calendarNow() : formatClock({ time: entry.startTime })}
	</span>
	<span class="flex min-w-0 flex-col">
		<span>{entry.name}</span>
		{#if place}
			<span class="text-base-content/70 truncate text-xs">
				<i aria-hidden="true" class="ph-duotone ph-map-pin"></i>
				{place}
			</span>
		{/if}
	</span>
{/snippet}

{#snippet line(entry: E, now = false)}
	<li class="text-sm {onEntryClick ? '-mx-2' : ''}">
		{#if onEntryClick}
			<button
				type="button"
				class="hover:bg-base-200 rounded-field flex w-full cursor-pointer items-baseline gap-3 px-2 py-2 text-left"
				onclick={() => onEntryClick(entry)}
			>
				{@render content(entry, now)}
			</button>
		{:else}
			<div class="flex items-baseline gap-3 py-1">
				{@render content(entry, now)}
			</div>
		{/if}
	</li>
{/snippet}

<ul class="flex flex-col">
	{#each timeline.current as entry (entry.id)}
		{@render line(entry, true)}
	{/each}
	{#each timeline.upcoming as { entry, newDay } (entry.id)}
		{#if newDay}
			<li class="text-base-content/70 pt-1 text-xs">
				<i aria-hidden="true" class="ph-duotone ph-calendar-blank"></i>
				{calendarDayText(entry.startTime)}
			</li>
		{/if}
		{@render line(entry)}
	{/each}
</ul>
