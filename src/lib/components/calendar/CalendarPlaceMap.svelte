<script lang="ts">
	// MapLibre is large: loaded only when a map shows.
	const loadPlaceMap = () => import('#lib/components/map/PlaceMap.svelte');
	interface Props {
		name: string;
		lat: number;
		lng: number;
	}

	let { name, lat, lng }: Props = $props();

	let appleMapsUrl = $derived(
		`https://maps.apple.com/?ll=${lat},${lng}` + (name ? `&q=${encodeURIComponent(name)}` : '')
	);
	let googleMapsUrl = $derived(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`);
	let osmUrl = $derived(
		`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=15/${lat}/${lng}`
	);
</script>

{#snippet mapLink(href: string, icon: string, label: string)}
	<a
		{href}
		target="_blank"
		rel="external noopener noreferrer"
		class="btn btn-outline btn-sm gap-1.5"
	>
		<i aria-hidden="true" class={icon}></i>
		{label}
	</a>
{/snippet}

{#await loadPlaceMap() then { default: PlaceMap }}
	<div data-vaul-no-drag>
		<PlaceMap {lat} {lng} {name} class="h-[250px] overflow-hidden rounded-box" />
	</div>
{/await}

<div class="flex flex-wrap gap-2">
	{@render mapLink(appleMapsUrl, 'ph ph-apple-logo', 'Maps')}
	{@render mapLink(googleMapsUrl, 'ph ph-google-logo', 'Maps')}
	{@render mapLink(osmUrl, 'ph-duotone ph-map-trifold', 'OpenStreetMap')}
</div>
