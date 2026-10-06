<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import CalendarPlaceMap from './CalendarPlaceMap.svelte';
	import type { CalendarPlace } from './calendarTypes';

	interface Props {
		place?: CalendarPlace | null;
		room?: string | null;
	}

	let { place = null, room = null }: Props = $props();

	let locationLabel = $derived([place?.name, room].filter(Boolean).join(' · '));
</script>

{#snippet placeNotes(current: CalendarPlace)}
	{#if current.info}
		<div class="alert alert-warning text-sm">
			<i class="fa-solid fa-triangle-exclamation fa-fw"></i>
			<span>{current.info}</span>
		</div>
	{/if}

	{#if current.directions}
		<div class="alert alert-soft text-base-content">
			<i class="fa-duotone fa-bus fa-fw"></i>
			<div>
				<div class="font-semibold">{m.calendarPlaceDirections()}</div>
				<p class="whitespace-pre-wrap text-sm">
					{current.directions}
				</p>
			</div>
		</div>
	{/if}
{/snippet}

{#snippet placeLinks(current: CalendarPlace)}
	{#if current.websiteUrl || current.sitePlanUrl}
		<div class="flex flex-wrap gap-2">
			{#if current.websiteUrl}
				<a
					href={current.websiteUrl}
					target="_blank"
					rel="external noopener noreferrer"
					class="btn btn-outline btn-sm gap-1.5"
				>
					<i class="fa-duotone fa-globe"></i>
					{m.calendarPlaceWebsite()}
				</a>
			{/if}
			{#if current.sitePlanUrl}
				<a
					href={current.sitePlanUrl}
					rel="external"
					download="{current.name} - {m.calendarPlaceSitePlan()}.pdf"
					class="btn btn-outline btn-sm gap-1.5"
				>
					<i class="fa-duotone fa-map"></i>
					{m.calendarPlaceSitePlanDownload()}
				</a>
			{/if}
		</div>
	{/if}
{/snippet}

{#if place || room}
	<div class="alert alert-soft text-base-content">
		<i class="fa-duotone fa-location-dot fa-fw"></i>
		<div class="min-w-0 flex-1">
			<div class="font-semibold">{locationLabel}</div>
			{#if place?.address}
				<div class="text-xs opacity-70">{place.address}</div>
			{/if}
		</div>
	</div>
{/if}

{#if place}
	{@render placeNotes(place)}
	{@render placeLinks(place)}
	{#if place.latitude != null && place.longitude != null}
		<CalendarPlaceMap name={place.name} lat={place.latitude} lng={place.longitude} />
	{/if}
{/if}
