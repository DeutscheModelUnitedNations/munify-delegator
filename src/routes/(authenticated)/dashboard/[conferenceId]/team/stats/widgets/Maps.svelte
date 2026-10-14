<script lang="ts">
	import { Map, TileLayer, Popup, Marker } from 'sveaflet';
	import { divIcon, point } from 'leaflet';
	import { MarkerCluster } from 'sveaflet-markercluster';
	import { m } from '$lib/paraglide/messages';
	import { client } from '$lib/api/rumbleClient/client';
	import { statsQueryFilter } from '../stats.svelte';

	let { conferenceId }: { conferenceId: string } = $props();

	// The server groups by three-digit ZIP area and resolves each area's centre.
	const stats = $derived(
		await client.query.getConferenceStatistics({
			__args: { conferenceId, filter: statsQueryFilter() },
			addresses: {
				country: true,
				zipPrefix: true,
				lat: true,
				lng: true,
				_count: { zipPrefix: true }
			}
		})
	);
	const areas = $derived(
		stats.addresses.flatMap((a) =>
			a.zipPrefix !== null && a.lat !== null && a.lng !== null
				? [
						{
							zipPrefix: a.zipPrefix,
							country: a.country,
							lat: a.lat,
							lng: a.lng,
							count: a._count.zipPrefix
						}
					]
				: []
		)
	);
</script>

<section class="card border border-base-300 bg-base-200 col-span-2 md:col-span-12 xl:col-span-12">
	<div class="card-body p-4">
		<h2 class="card-title text-base font-semibold">
			<i class="fa-sharp-duotone fa-solid fa-map-location-dot text-base-content/70"></i>
			{m.statsGeographicDistribution()}
		</h2>
		<div class="w-full h-[400px] rounded-box overflow-hidden">
			<Map options={{ center: [51.948, 10.2651], zoom: 6 }}>
				<TileLayer
					url={'https://tile.openstreetmap.org/{z}/{x}/{y}.png'}
					options={{
						attribution:
							'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
					}}
				/>
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
								const markerData = markers[i].options?.data;
								count += markerData?.count ?? 0;
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
					{#each areas as item (`${item.country}_${item.zipPrefix}`)}
						{@const markerTitle = `${m.zipCode()}: ${item.zipPrefix}xx (${item.count})`}
						<Marker
							latLng={[item.lat, item.lng]}
							options={{ title: markerTitle, data: { count: item.count } }}
						>
							<Popup>
								<strong>{m.zipCode()}: {item.zipPrefix}xx</strong><br />
								{m.participants()}: {item.count}
							</Popup>
						</Marker>
					{/each}
				</MarkerCluster>
			</Map>
		</div>
	</div>
</section>
