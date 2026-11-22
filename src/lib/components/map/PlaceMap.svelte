<script lang="ts">
	import { MapLibre, DefaultMarker, Popup, NavigationControl } from 'svelte-maplibre';
	import { mapStyle } from './mapStyle.svelte.js';

	let {
		lat,
		lng,
		name,
		class: className
	}: { lat: number; lng: number; name?: string; class: string } = $props();
</script>

<MapLibre style={mapStyle()} class={className} center={[lng, lat]} zoom={15} cooperativeGestures>
	<NavigationControl showCompass={false} />
	<DefaultMarker lngLat={[lng, lat]}>
		{#if name}
			<Popup offset={[0, -10]}>{name}</Popup>
		{/if}
	</DefaultMarker>
</MapLibre>
