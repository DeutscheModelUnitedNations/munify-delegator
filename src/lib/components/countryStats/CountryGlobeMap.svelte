<script lang="ts">
	import {
		MapLibre,
		GeoJSON,
		FillLayer,
		LineLayer,
		CircleLayer,
		Popup,
		NavigationControl,
		Control,
		ControlGroup,
		ControlButton
	} from 'svelte-maplibre';
	import type { Map as MaplibreMap } from 'maplibre-gl';
	import type { FeatureCollection, Point } from 'geojson';
	import { m } from '#lib/paraglide/messages';
	import { mapStyle } from '#lib/components/map/mapStyle.svelte.js';
	import type { CountryShapes } from '#lib/countryStats/countryShapes';

	// A component of its own on purpose: the layers render in the map's children, which appear once
	// the map exists, and an awaited `$derived` read there never renders (see AreaMap.svelte).
	// Here everything is a plain prop.
	interface Props {
		shapes: CountryShapes;
		center: { lat: number; lng: number };
		zoom: number;
		/** The country's name, for the recenter button */
		name: string;
		/** Small countries get a dot: their outline alone would vanish at globe zoom */
		marker: boolean;
	}

	let { shapes, center, zoom, name, marker }: Props = $props();

	let map = $state<MaplibreMap>();

	const centerPoint: FeatureCollection<Point> = $derived({
		type: 'FeatureCollection',
		features: [
			{
				type: 'Feature',
				properties: {},
				geometry: { type: 'Point', coordinates: [center.lng, center.lat] }
			}
		]
	});

	function recenter() {
		map?.flyTo({ center: [center.lng, center.lat], zoom, bearing: 0, pitch: 0 });
	}
</script>

<MapLibre
	bind:map
	style={mapStyle()}
	class="h-80 w-full overflow-hidden rounded-box md:h-96"
	projection={{ type: 'globe' }}
	center={[center.lng, center.lat]}
	{zoom}
	cooperativeGestures
>
	<NavigationControl showCompass={false} />
	<Control position="top-left">
		<ControlGroup>
			<ControlButton onclick={recenter} title={m.countryGlobeRecenter({ country: name })}>
				<i aria-hidden="true" class="ph-duotone ph-crosshair text-base text-[#333]"></i>
				<span class="sr-only">{m.countryGlobeRecenter({ country: name })}</span>
			</ControlButton>
		</ControlGroup>
	</Control>
	<GeoJSON data={shapes}>
		<FillLayer
			filter={['==', ['get', 'role'], 'neighbour']}
			hoverCursor="pointer"
			paint={{ 'fill-color': '#f1b434', 'fill-opacity': 0.35 }}
		>
			<Popup openOn="hover" closeButton={false}>
				{#snippet children({ data })}
					{data?.properties?.name}
				{/snippet}
			</Popup>
		</FillLayer>
		<FillLayer
			filter={['==', ['get', 'role'], 'country']}
			paint={{ 'fill-color': '#4fa3d9', 'fill-opacity': 0.7 }}
		/>
		<LineLayer
			interactive={false}
			paint={{
				'line-color': ['match', ['get', 'role'], 'country', '#1f5f8b', '#b7841a'],
				'line-width': ['match', ['get', 'role'], 'country', 1.5, 0.75]
			}}
		/>
	</GeoJSON>
	{#if marker}
		<GeoJSON data={centerPoint}>
			<CircleLayer
				interactive={false}
				paint={{
					'circle-color': '#4fa3d9',
					'circle-radius': 7,
					'circle-stroke-width': 2,
					'circle-stroke-color': '#ffffff'
				}}
			/>
		</GeoJSON>
	{/if}
</MapLibre>
