<script lang="ts">
	import { Drawer } from 'vaul-svelte';
	import type { DrawerDirection } from 'vaul-svelte';
	import type { CalendarEntryColor } from '@prisma/client';
	import { browser } from '$app/environment';
	import { getColorConfig } from './calendarColors';
	import { translateCalendarEntryColor } from '$lib/services/enumTranslations';
	import { m } from '$lib/paraglide/messages';

	interface Place {
		id: string;
		name: string;
		address?: string | null;
		latitude?: number | null;
		longitude?: number | null;
		directions?: string | null;
		info?: string | null;
		websiteUrl?: string | null;
		sitePlanDataURL?: string | null;
	}

	interface EntryDetail {
		id: string;
		startTime: Date;
		endTime: Date;
		name: string;
		description?: string | null;
		fontAwesomeIcon?: string | null;
		color: CalendarEntryColor;
		place?: Place | null;
		room?: string | null;
		calendarTrackId?: string | null;
	}

	interface Track {
		id: string;
		name: string;
		description?: string | null;
	}

	interface Props {
		open: boolean;
		entry: EntryDetail | null;
		track?: Track | null;
		dayName?: string;
		dayDate?: Date | null;
	}

	let { open = $bindable(), entry, track = null, dayName, dayDate = null }: Props = $props();

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

	let colorConfig = $derived(entry ? getColorConfig(entry.color) : null);
	let colorLabel = $derived(entry ? translateCalendarEntryColor(entry.color) : '');

	let timeLabel = $derived(
		entry
			? `${new Date(entry.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – ${new Date(entry.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
			: ''
	);

	let formattedDate = $derived(
		dayDate
			? new Date(dayDate).toLocaleDateString(undefined, {
					weekday: 'long',
					day: '2-digit',
					month: '2-digit',
					year: 'numeric'
				})
			: null
	);

	let mapCenter = $derived(
		entry?.place?.latitude != null && entry?.place?.longitude != null
			? { lat: entry.place.latitude, lng: entry.place.longitude }
			: null
	);

	let appleMapsUrl = $derived.by(() => {
		if (!mapCenter) return null;
		const params = new URLSearchParams({ ll: `${mapCenter.lat},${mapCenter.lng}` });
		const name = entry?.place?.name;
		if (name) params.set('q', name);
		return `https://maps.apple.com/?${params.toString()}`;
	});

	let googleMapsUrl = $derived(
		mapCenter
			? `https://www.google.com/maps/search/?api=1&query=${mapCenter.lat},${mapCenter.lng}`
			: null
	);

	let osmUrl = $derived(
		mapCenter
			? `https://www.openstreetmap.org/?mlat=${mapCenter.lat}&mlon=${mapCenter.lng}#map=15/${mapCenter.lat}/${mapCenter.lng}`
			: null
	);
</script>

{#key direction}
	<Drawer.Root bind:open {direction}>
		<Drawer.Portal>
			<Drawer.Overlay class="fixed inset-0 z-40 bg-black/40" />
			<Drawer.Content
				class="bg-base-100 fixed z-50 flex flex-col outline-none {direction === 'bottom'
					? 'bottom-0 left-0 right-0 max-h-[85vh] overflow-hidden rounded-t-2xl'
					: 'top-0 right-0 bottom-0 w-full sm:max-w-md md:max-w-lg'}"
			>
				{#if entry && colorConfig}
					<!-- Header -->
					<div
						class="{colorConfig.bg} border-b {colorConfig.border} px-5 {direction === 'bottom'
							? 'rounded-t-2xl pt-2 pb-4'
							: 'py-4'}"
					>
						{#if direction === 'bottom'}
							<div class="flex justify-center pb-3 pt-1">
								<div class="bg-base-content/30 h-1.5 w-12 rounded-full"></div>
							</div>
						{/if}
						<div class="flex items-start gap-3">
							{#if entry.fontAwesomeIcon}
								<i class="fa-solid fa-{entry.fontAwesomeIcon} {colorConfig.text} mt-0.5 text-xl"
								></i>
							{/if}
							<div class="min-w-0 flex-1">
								<Drawer.Title class="text-lg font-bold leading-tight">
									{entry.name}
								</Drawer.Title>
								<span
									class="{colorConfig.text} mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium {colorConfig.bg} ring-1 {colorConfig.ring}"
								>
									{colorLabel}
								</span>
							</div>
							<button
								type="button"
								class="btn btn-ghost btn-sm btn-square"
								onclick={() => (open = false)}
								aria-label="Close"
							>
								<i class="fa-solid fa-xmark text-lg"></i>
							</button>
						</div>
					</div>

					<!-- Scrollable content -->
					<div class="flex-1 overflow-y-auto" data-vaul-no-drag>
						<div class="space-y-3 p-4">
							<!-- Time & Track -->
							<div class="alert alert-soft text-base-content">
								<i class="fa-duotone fa-clock fa-fw"></i>
								<div>
									<div class="font-semibold">{timeLabel}</div>
									<div class="text-xs">
										{#if dayName}{dayName}{/if}
										{#if dayName && formattedDate}
											&middot;
										{/if}
										{#if formattedDate}{formattedDate}{/if}
									</div>
									{#if track}
										<div class="mt-1 text-xs">
											<i class="fa-solid fa-layer-group mr-1"></i>
											{track.name}
											{#if track.description}
												&middot; {track.description}
											{/if}
										</div>
									{/if}
								</div>
							</div>

							<!-- Description -->
							{#if entry.description}
								<p class="text-base-content/80 whitespace-pre-wrap px-1 text-sm">
									{entry.description}
								</p>
							{/if}

							<div class="divider" />

							<!-- Location -->
							{#if entry.place || entry.room}
								<div class="alert alert-soft text-base-content">
									<i class="fa-duotone fa-location-dot fa-fw"></i>
									<div class="min-w-0 flex-1">
										<div class="font-semibold">
											{#if entry.place}{entry.place.name}{/if}
											{#if entry.place && entry.room}
												&middot;
											{/if}
											{#if entry.room}{entry.room}{/if}
										</div>
										{#if entry.place?.address}
											<div class="text-xs opacity-70">{entry.place.address}</div>
										{/if}
									</div>
								</div>

								{#if entry.place?.info}
									<div class="alert alert-warning text-sm">
										<i class="fa-solid fa-triangle-exclamation fa-fw"></i>
										<span>{entry.place.info}</span>
									</div>
								{/if}

								{#if entry.place?.directions}
									<div class="alert alert-soft text-base-content">
										<i class="fa-duotone fa-bus fa-fw"></i>
										<div>
											<div class="font-semibold">{m.calendarPlaceDirections()}</div>
											<p class="whitespace-pre-wrap text-sm">
												{entry.place.directions}
											</p>
										</div>
									</div>
								{/if}

								{#if entry.place?.websiteUrl || entry.place?.sitePlanDataURL}
									<div class="flex flex-wrap gap-2">
										{#if entry.place?.websiteUrl}
											<a
												href={entry.place.websiteUrl}
												target="_blank"
												rel="noopener noreferrer"
												class="btn btn-outline btn-sm gap-1.5"
											>
												<i class="fa-duotone fa-globe"></i>
												{m.calendarPlaceWebsite()}
											</a>
										{/if}
										{#if entry.place?.sitePlanDataURL}
											<a
												href={entry.place.sitePlanDataURL}
												download="{entry.place.name} - {m.calendarPlaceSitePlan()}.pdf"
												class="btn btn-outline btn-sm gap-1.5"
											>
												<i class="fa-duotone fa-map"></i>
												{m.calendarPlaceSitePlanDownload()}
											</a>
										{/if}
									</div>
								{/if}

								<!-- Map -->
								{#if mapCenter}
									{#await import('sveaflet') then { Map, TileLayer, Marker, Popup }}
										<div class="h-[250px] overflow-hidden rounded-lg" data-vaul-no-drag>
											<Map
												options={{
													center: [mapCenter.lat, mapCenter.lng],
													zoom: 15,
													scrollWheelZoom: false
												}}
											>
												<TileLayer
													url={'https://tile.openstreetmap.org/{z}/{x}/{y}.png'}
													options={{
														attribution:
															'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
													}}
												/>
												<Marker latLng={[mapCenter.lat, mapCenter.lng]}>
													<Popup>{entry?.place?.name ?? ''}</Popup>
												</Marker>
											</Map>
										</div>
									{/await}

									<div class="flex flex-wrap gap-2">
										{#if appleMapsUrl}
											<a
												href={appleMapsUrl}
												target="_blank"
												rel="noopener noreferrer"
												class="btn btn-outline btn-sm gap-1.5"
											>
												<i class="fa-brands fa-apple"></i>
												Maps
											</a>
										{/if}
										{#if googleMapsUrl}
											<a
												href={googleMapsUrl}
												target="_blank"
												rel="noopener noreferrer"
												class="btn btn-outline btn-sm gap-1.5"
											>
												<i class="fa-brands fa-google"></i>
												Maps
											</a>
										{/if}
										{#if osmUrl}
											<a
												href={osmUrl}
												target="_blank"
												rel="noopener noreferrer"
												class="btn btn-outline btn-sm gap-1.5"
											>
												<i class="fa-duotone fa-map"></i>
												OpenStreetMap
											</a>
										{/if}
									</div>
								{/if}
							{/if}
						</div>
					</div>
				{/if}
			</Drawer.Content>
		</Drawer.Portal>
	</Drawer.Root>
{/key}
