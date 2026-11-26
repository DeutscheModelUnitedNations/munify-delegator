<script lang="ts">
	import { MapLibre, DefaultMarker, Popup, NavigationControl } from 'svelte-maplibre';
	import { mapStyle } from './mapStyle.svelte.js';

	let {
		lat,
		lng,
		name,
		class: className
	}: { lat: number; lng: number; name?: string; class: string } = $props();

	// MapLibre throws on a latitude outside ±90 (a typo in the place form): show no map instead.
	const valid = $derived(Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90);
</script>

{#if valid}
	<MapLibre style={mapStyle()} class={className} center={[lng, lat]} zoom={15} cooperativeGestures>
		<NavigationControl showCompass={false} />
		<DefaultMarker lngLat={[lng, lat]}>
			{#if name}
				<Popup offset={[0, -10]}>{name}</Popup>
			{/if}
		</DefaultMarker>
	</MapLibre>
{/if}
