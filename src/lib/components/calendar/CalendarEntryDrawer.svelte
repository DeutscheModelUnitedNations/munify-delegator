<script lang="ts">
	import SlidePanel, { type DrawerDirection } from '$lib/components/SlidePanel.svelte';
	import { browser } from '$app/environment';
	import { m } from '$lib/paraglide/messages';
	import CalendarEntryDrawerHeader from './CalendarEntryDrawerHeader.svelte';
	import CalendarEntryTimeInfo from './CalendarEntryTimeInfo.svelte';
	import CalendarEntryLocation from './CalendarEntryLocation.svelte';
	import type { CalendarEntry, CalendarTrack } from './calendarTypes';

	interface Props {
		open: boolean;
		entry: CalendarEntry | null;
		track?: Pick<CalendarTrack, 'name' | 'description'> | null;
		dayName?: string;
		dayDate?: Date | null;
		onEditEntry?: (entryId: string) => void;
		onEditPlace?: (placeId: string) => void;
	}

	let {
		open = $bindable(),
		entry,
		track = null,
		dayName,
		dayDate = null,
		onEditEntry,
		onEditPlace
	}: Props = $props();

	// Responsive direction: bottom on mobile, right on desktop
	let isMobile = $state(browser ? window.innerWidth < 768 : true);

	$effect(() => {
		if (!browser) return;
		const mql = window.matchMedia('(min-width: 768px)');
		const handler = (e: MediaQueryListEvent) => {
			isMobile = !e.matches;
		};
		isMobile = !mql.matches;
		mql.addEventListener('change', handler);
		return () => mql.removeEventListener('change', handler);
	});

	let direction: DrawerDirection = $derived(isMobile ? 'bottom' : 'right');

	const closeAnd = (action: () => void) => {
		open = false;
		action();
	};
</script>

{#snippet actions(current: CalendarEntry)}
	{#if onEditEntry || onEditPlace}
		<div class="border-base-300 bg-base-100 flex flex-wrap gap-2 border-t px-5 py-3">
			{#if onEditEntry}
				<button
					class="btn btn-soft btn-sm gap-1.5"
					onclick={() => closeAnd(() => onEditEntry(current.id))}
				>
					<i class="fa-duotone fa-pen-to-square"></i>
					{m.calendarEditEntry()}
				</button>
			{/if}
			{#if onEditPlace && current.place}
				{@const placeId = current.place.id}
				<button
					class="btn btn-soft btn-sm gap-1.5"
					onclick={() => closeAnd(() => onEditPlace(placeId))}
				>
					<i class="fa-duotone fa-location-pen"></i>
					{m.calendarEditPlace()}
				</button>
			{/if}
		</div>
	{/if}
{/snippet}

{#key direction}
	<SlidePanel
		bind:open
		{direction}
		class={direction === 'bottom'
			? 'max-h-[85vh] overflow-hidden rounded-t-2xl'
			: 'sm:max-w-md md:max-w-lg'}
	>
		{#if entry}
			<CalendarEntryDrawerHeader {entry} {direction} onClose={() => (open = false)} />

			<!-- Scrollable content -->
			<div class="flex-1 overflow-y-auto">
				<div class="space-y-3 p-4">
					<CalendarEntryTimeInfo {entry} {track} {dayName} {dayDate} />

					{#if entry.description}
						<p class="text-base-content/80 whitespace-pre-wrap px-1 text-sm">
							{entry.description}
						</p>
					{/if}

					<div class="divider"></div>

					<CalendarEntryLocation place={entry.place} room={entry.room} />
				</div>
			</div>

			{@render actions(entry)}
		{/if}
	</SlidePanel>
{/key}
