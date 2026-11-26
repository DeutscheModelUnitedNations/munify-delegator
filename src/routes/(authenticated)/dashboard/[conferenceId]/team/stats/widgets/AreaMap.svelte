<script lang="ts">
	import {
		MapLibre,
		GeoJSON,
		CircleLayer,
		SymbolLayer,
		Popup,
		NavigationControl,
		type LayerClickInfo
	} from 'svelte-maplibre';
	import { GeoJSONSource } from 'maplibre-gl';
	import type { FeatureCollection, Point } from 'geojson';
	import { m } from '#lib/paraglide/messages';
	import { mapStyle } from '#lib/components/map/mapStyle.svelte.js';
	import { getLocale } from '#lib/paraglide/runtime';
	import { alpha3ToAlpha2 } from '#lib/helpers/countryCodes';
	import type { ZipArea } from './mapAreas';

	// A component of its own on purpose: inside `Maps.svelte` the layers would read the awaited
	// `stats`, and Svelte (5.57) wraps such reads in an async block that never renders when it
	// is created later, in the map's children (they appear once the map exists). Here `areas` is
	// a plain prop.
	let { areas }: { areas: FeatureCollection<Point, ZipArea> } = $props();

	// The ZIP area centres come from GeoNames, whose licence asks for this credit.
	const attribution =
		'<a href="https://www.geonames.org/">GeoNames</a> (<a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>)';

	function countryName(alpha3: string) {
		const alpha2 = alpha3ToAlpha2(alpha3);
		return (
			(alpha2 && new Intl.DisplayNames([getLocale()], { type: 'region' }).of(alpha2)) ?? alpha3
		);
	}

	// A cluster click zooms in until it splits, as the marker cluster of the Leaflet map did.
	// Centred on the cluster, not the pointer: an off-centre click would grow with the zoom.
	async function zoomIntoCluster({ map, source, features }: LayerClickInfo) {
		const cluster = features[0];
		const clusterId = cluster?.properties?.cluster_id;
		const clusters = map.getSource(source);
		if (
			typeof clusterId !== 'number' ||
			cluster?.geometry.type !== 'Point' ||
			!(clusters instanceof GeoJSONSource)
		)
			return;
		const zoom = await clusters.getClusterExpansionZoom(clusterId);
		const [lng = 0, lat = 0] = cluster.geometry.coordinates;
		map.easeTo({ center: [lng, lat], zoom });
	}
</script>

<MapLibre
	style={mapStyle()}
	class="w-full h-[400px] rounded-box overflow-hidden"
	center={[10.27, 51.15]}
	zoom={5}
	cooperativeGestures
>
	<NavigationControl showCompass={false} />
	<GeoJSON
		data={areas}
		cluster={{ radius: 50, properties: { total: ['+', ['get', 'count']] } }}
		{attribution}
	>
		<!-- Cluster size and colour by participants, not by number of ZIP areas. -->
		<CircleLayer
			applyToClusters
			hoverCursor="pointer"
			onclick={zoomIntoCluster}
			paint={{
				'circle-color': ['step', ['get', 'total'], '#4fa3d9', 10, '#f1b434', 50, '#e0513b'],
				'circle-radius': ['step', ['get', 'total'], 16, 10, 20, 50, 26],
				'circle-opacity': 0.85,
				'circle-stroke-width': 2,
				'circle-stroke-color': '#ffffff'
			}}
		/>
		<!-- Labels pass clicks through to the circles below them. -->
		<SymbolLayer
			interactive={false}
			applyToClusters
			layout={{
				'text-field': ['to-string', ['get', 'total']],
				'text-font': ['Noto Sans Bold'],
				'text-size': 12
			}}
			paint={{ 'text-color': '#1b1837' }}
		/>
		<CircleLayer
			applyToClusters={false}
			hoverCursor="pointer"
			paint={{
				'circle-color': '#4fa3d9',
				'circle-radius': 12,
				'circle-opacity': 0.85,
				'circle-stroke-width': 2,
				'circle-stroke-color': '#ffffff'
			}}
		>
			<Popup openOn="click">
				{#snippet children({ data })}
					{#if data?.properties}
						{#if data.properties.zipPrefix}
							<strong>{m.zipCode()}: {data.properties.zipPrefix}xx</strong><br />
						{:else}
							<strong>{countryName(data.properties.country)}</strong><br />
							{m.statsZipAreaUnknown()}<br />
						{/if}
						{m.participants()}: {data.properties.count}
					{/if}
				{/snippet}
			</Popup>
		</CircleLayer>
		<SymbolLayer
			interactive={false}
			applyToClusters={false}
			layout={{
				'text-field': ['to-string', ['get', 'count']],
				'text-font': ['Noto Sans Bold'],
				'text-size': 11
			}}
			paint={{ 'text-color': '#1b1837' }}
		/>
	</GeoJSON>
</MapLibre>
