<script lang="ts">
  export const ssr = false;
	import { Map, TileLayer, Popup } from 'sveaflet';
	import L from 'leaflet';
	import 'leaflet.markercluster';
	import { onMount } from 'svelte';
	import type { PageData } from '../$types';
	import type { ConferenceStatsQuery$result } from '$houdini';

	interface Props {
		addresses: ConferenceStatsQuery$result['getConferenceStatistics']['addresses'];
	}

	type Coordinate = {
		zip: string;
		country: string;
		lat: number;
		lon: number;
		cached?: boolean;
		zipCount: number;
	};

	let { addresses }: Props = $props();
  console.log('Addresses from props:', addresses);
	let coordinates: Coordinate[] = $state([]);
	let map: L.Map;

	// fetch coordinates
	async function fetchCoordinates(addresses) {
		// call the relative endpoint that lives under the current stats route
		// (the endpoint file is at src/routes/(authenticated)/management/[conferenceId]/stats/zip-api/+server.ts)
		// Build an absolute URL from the current location so we always target the
		// stats folder (avoids browser relative-URL quirks when the path doesn't
		// end with a trailing slash). Example result: /management/:conferenceId/stats/zip-api
		const base = window.location.pathname.replace(/\/?$/, '/');
		const endpoint = base + 'zip-api';
		console.log('POST /zip-api payload:', addresses);
		//console.log('Fetching:', endpoint);
		const res = await fetch(endpoint, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(addresses)
		});
		console.log('Status:', res.status);
    

		const data = await res.json();
    console.log('Response data:', data);
		coordinates = data
    .filter(item => item.lat != null && item.lon != null)
    .map(item => {
      const addr = addresses.find(a => a.zip === item.zip);
      return {
        ...item,
        lat: Number(item.lat),
        lon: Number(item.lon),
        zipCount: addr?._count.zip ?? 0
      };
    });
	}

	// create marker cluster layer
	function addMarkerCluster(map: L.Map, coordinates: Coordinate[]) {
		const markers = L.markerClusterGroup();

		coordinates.forEach((c) => {
			const marker = L.marker([c.lat, c.lon]).bindPopup(`<b>${c.zip}</b> (${c.zipCount})`);
			markers.addLayer(marker);
		});

		map.addLayer(markers);

		// fit map to all markers
		const group = new L.FeatureGroup(coordinates.map((c) => L.marker([c.lat, c.lon])));
		map.fitBounds(group.getBounds().pad(0.5));
	}

	onMount(async () => {
    console.log('onMount executed');
		await fetchCoordinates(addresses);

		if (map && coordinates.length > 0) {
			addMarkerCluster(map, coordinates);
		}
	});
</script>

<section
	class="card bg-primary text-primary-content col-span-2 grow shadow-sm md:col-span-12 xl:col-span-6"
>
	{#if coordinates.length === 0}
		<div class="p-4">No coordinates yet.</div>
	{:else}
		<div class="overflow-auto p-4" style="max-height:200px">
			<strong>Coordinates ({coordinates.length})</strong>
			<ul class="mt-2">
				{#each coordinates as c (c.zip)}
					<li>
						<code>{c.zip}</code> — {c.country} — {c.lat.toFixed(6)}, {c.lon.toFixed(6)} ({c.zipCount})
						{c.cached ? '· cached' : ''}
					</li>
				{/each}
			</ul>
		</div>
	{/if}
	<div style="width: 100%; height: 500px;">
		<Map bind:this={map} options={{ center: [51.505, -0.09], zoom: 6 }}>
			<TileLayer url="https://tile.openstreetmap.org/" />
		</Map>
	</div>
</section>
