<script lang="ts">
	import { Map, TileLayer, Popup, Marker } from 'sveaflet';
	import { divIcon, point } from 'leaflet';
	import { MarkerCluster } from 'sveaflet-markercluster';
	import type { ConferenceStatsQuery$result } from '$houdini';
	import type { ZipCoordinate } from '../zip-api/+server';
	import { m } from '$lib/paraglide/messages';
	import { page } from '$app/state';

	interface Props {
		addresses: ConferenceStatsQuery$result['getConferenceStatistics']['addresses'];
	}

	type Coordinate = {
		zip: string;
		country: string;
		lat: number;
		lng: number;
		cached?: boolean;
		zipCount: number;
	};

	let { addresses }: Props = $props();
	let coordinates: Coordinate[] = $state([]);

	// fetch coordinates
	async function fetchCoordinates() {
		// call the relative endpoint that lives under the current stats route
		// (the endpoint file is at src/routes/(authenticated)/management/[conferenceId]/stats/zip-api/+server.ts)
		// Build an absolute URL from the current location so we always target the
		// stats folder (avoids browser relative-URL quirks when the path doesn't
		// end with a trailing slash). Example result: /management/:conferenceId/stats/zip-api
		const base = page.url.pathname.replace(/\/?$/, '/');
		const endpoint = base + 'zip-api';
		const res = await fetch(endpoint, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(addresses.filter((a) => a.country === 'DEU'))
		});
		const data: ZipCoordinate[] = await res.json();
		return data
			.filter((item) => item.lat != null && item.lng != null)
			.map((item) => {
				const addr = addresses.find((a) => a.zip === item.zip && a.country === 'DEU');
				return {
					...item,
					lat: Number(item.lat),
					lng: Number(item.lng),
					zipCount: addr?._count.zip ?? 0,
					country: addr?.country ?? 'N/A'
				};
			})
			.filter((item) => item.country != 'N/A');
	}

	$effect(() => {
		fetchCoordinates().then((data) => {
			coordinates = data;
		});
	});
</script>

<section
	class="card bg-primary text-primary-content col-span-2 grow shadow-sm md:col-span-12 xl:col-span-6"
>
	<div class="w-full h-[500px]">
		<Map options={{ center: [51.948, 10.2651], zoom: 6 }}>
			<TileLayer url={'https://tile.openstreetmap.org/{z}/{x}/{y}.png'} />
			<!-- Marker Rendering -->
			<MarkerCluster
				options={{
					spiderLegPolylineOptions: {
						weight: 2,
						color: '#f00',
						opacity: 0.5
					},
					iconCreateFunction: (cluster) => {
						const markers = cluster.getAllChildMarkers();
						let count = 0;
						let icon_size = ' marker-cluster-';
						for (let i = 0; i < markers.length; i++) {
							count += markers[i].options.data.count;
						}
						if (count < 10) {
							icon_size += 'small';
						} else if (count < 50) {
							icon_size += 'medium';
						} else {
							icon_size += 'large';
						}
						return divIcon({
							html: `<div><span>${count}</span></div>`,
							className: `marker-cluster${icon_size}`,
							iconSize: point(40, 40)
						});
					}
				}}
			>
				{#each coordinates as item (`${item.country}_${item.zip}`)}
					{@const markerTitle = `${m.zipCode()}: ${item.zip} (${item.zipCount})`}
					<Marker
						latLng={[item.lat, item.lng]}
						options={{ title: markerTitle, data: { count: item.zipCount } }}
					>
						<Popup>
							<strong>{m.zipCode()}: {item.zip}</strong><br />
							{m.participants()}: {item.zipCount}
						</Popup>
					</Marker>
				{/each}
			</MarkerCluster>
		</Map>
	</div>
</section>
