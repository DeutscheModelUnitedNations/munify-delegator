<script lang="ts">
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
		<i class={icon}></i>
		{label}
	</a>
{/snippet}

{#await import('sveaflet') then { Map, TileLayer, Marker, Popup }}
	<div class="h-[250px] overflow-hidden rounded-box" data-vaul-no-drag>
		<Map
			options={{
				center: [lat, lng],
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
			<Marker latLng={[lat, lng]}>
				<Popup>{name}</Popup>
			</Marker>
		</Map>
	</div>
{/await}

<div class="flex flex-wrap gap-2">
	{@render mapLink(appleMapsUrl, 'fa-brands fa-apple', 'Maps')}
	{@render mapLink(googleMapsUrl, 'fa-brands fa-google', 'Maps')}
	{@render mapLink(osmUrl, 'fa-sharp-duotone fa-solid fa-map', 'OpenStreetMap')}
</div>
