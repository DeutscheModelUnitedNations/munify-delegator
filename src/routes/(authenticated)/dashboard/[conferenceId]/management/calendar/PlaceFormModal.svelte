<script lang="ts">
	import ActionModal from '$lib/components/ActionModal.svelte';
	import { client } from '$lib/api/rumbleClient/client';
	import { m } from '$lib/paraglide/messages';
	import { decodePlusCodeFull, recoverPlusCode } from './plusCode';
	import { untrack } from 'svelte';

	interface Props {
		conferenceId: string;
		/** The place to edit; a new place is created when this is left out. */
		placeId?: string;
		onClose: () => void;
	}

	let { conferenceId, placeId, onClose }: Props = $props();

	// The modal is mounted once per place it edits, and its fields are seeded once: re-reading
	// the row while someone types would discard their edits.
	const editedPlaceId = untrack(() => placeId);
	const place = editedPlaceId
		? await client.query.place({
				__args: { id: editedPlaceId },
				id: true,
				name: true,
				address: true,
				latitude: true,
				longitude: true,
				directions: true,
				info: true,
				websiteUrl: true,
				sitePlanUrl: true
			})
		: undefined;

	let isLoading = $state(false);

	let placeName = $state(place?.name ?? '');
	let placeAddress = $state(place?.address ?? '');
	let placeLatitude = $state(place?.latitude != null ? String(place.latitude) : '');
	let placeLongitude = $state(place?.longitude != null ? String(place.longitude) : '');
	let placeDirections = $state(place?.directions ?? '');
	let placeInfo = $state(place?.info ?? '');
	let placeWebsiteUrl = $state(place?.websiteUrl ?? '');
	// The stored plan is served from a URL; only a plan picked in this modal is held as a data
	// URL, to be uploaded. Leaving it untouched sends nothing, which keeps the stored one.
	const storedSitePlanUrl = place?.sitePlanUrl ?? null;
	let uploadedSitePlan = $state<string | null>(null);
	const sitePlanHref = $derived(uploadedSitePlan ?? storedSitePlanUrl);
	let placePlusCode = $state('');
	let plusCodeError = $state('');
	let plusCodeLoading = $state(false);

	async function decodePlusCode() {
		const input = placePlusCode.trim();
		if (!input) {
			plusCodeError = '';
			return;
		}

		// Extract the code part (before any whitespace) and optional city name
		const codeMatch = input.match(
			/^([23456789CFGHJMPQRVWXcfghjmpqrvwx0]+\+[23456789CFGHJMPQRVWXcfghjmpqrvwx0]*)/
		);
		if (!codeMatch) {
			plusCodeError = m.calendarPlacePlusCodeInvalid();
			return;
		}
		const code = codeMatch[1].toUpperCase();
		const cityPart = input.substring(codeMatch[0].length).trim();
		const sepIdx = code.indexOf('+');

		if (sepIdx === 8) {
			// Full code — decode directly
			const result = decodePlusCodeFull(code);
			if (!result) {
				plusCodeError = m.calendarPlacePlusCodeInvalid();
				return;
			}
			placeLatitude = String(result.latitude);
			placeLongitude = String(result.longitude);
			plusCodeError = '';
			return;
		}

		// Short code — needs a reference city
		if (!cityPart) {
			plusCodeError = m.calendarPlacePlusCodeShort();
			return;
		}

		plusCodeLoading = true;
		try {
			const response = await fetch(
				`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cityPart)}&format=json&limit=1`,
				{ headers: { 'User-Agent': 'MUNify-Delegator' } }
			);
			if (!response.ok) {
				plusCodeError = m.calendarPlacePlusCodeCityNotFound();
				return;
			}
			const data: { lat: string; lon: string }[] = await response.json();
			if (!data.length) {
				plusCodeError = m.calendarPlacePlusCodeCityNotFound();
				return;
			}

			const refLat = parseFloat(data[0].lat);
			const refLng = parseFloat(data[0].lon);
			const fullCode = recoverPlusCode(code, refLat, refLng);
			const result = decodePlusCodeFull(fullCode);
			if (!result) {
				plusCodeError = m.calendarPlacePlusCodeInvalid();
				return;
			}
			placeLatitude = String(result.latitude);
			placeLongitude = String(result.longitude);
			plusCodeError = '';
		} catch {
			plusCodeError = m.calendarPlacePlusCodeCityNotFound();
		} finally {
			plusCodeLoading = false;
		}
	}

	function handleSitePlanUpload(event: Event) {
		if (!(event.target instanceof HTMLInputElement)) return;
		const file = event.target.files?.[0];
		if (!file) return;
		if (file.size > 10 * 1024 * 1024) {
			alert('File too large (max 10MB)');
			event.target.value = '';
			return;
		}
		const reader = new FileReader();
		reader.onload = () => {
			if (typeof reader.result === 'string') {
				uploadedSitePlan = reader.result;
			}
		};
		reader.readAsDataURL(file);
	}

	async function savePlace() {
		if (!placeName) return;
		isLoading = true;
		const fields = {
			name: placeName,
			address: placeAddress || null,
			latitude: placeLatitude ? parseFloat(placeLatitude) : null,
			longitude: placeLongitude ? parseFloat(placeLongitude) : null,
			directions: placeDirections || null,
			info: placeInfo || null,
			websiteUrl: placeWebsiteUrl || null,
			sitePlanDataURL: uploadedSitePlan ?? undefined
		};
		try {
			if (editedPlaceId) {
				await client.mutate.updatePlace({ __args: { id: editedPlaceId, ...fields }, id: true });
			} else {
				await client.mutate.createPlace({ __args: { conferenceId, ...fields }, id: true });
			}
			onClose();
		} catch (error) {
			console.error(editedPlaceId ? 'Failed to update place:' : 'Failed to create place:', error);
		} finally {
			isLoading = false;
		}
	}
</script>

<ActionModal
	title={editedPlaceId ? m.calendarEditPlace() : m.calendarAddPlace()}
	boxClass="max-w-2xl"
	confirmLabel={editedPlaceId ? m.save() : m.create()}
	confirmDisabled={!placeName}
	loading={isLoading}
	onConfirm={savePlace}
	{onClose}
>
	<fieldset class="fieldset">
		<legend class="fieldset-legend">{m.calendarPlaceName()}</legend>
		<input type="text" bind:value={placeName} class="input w-full" required />
	</fieldset>
	<fieldset class="fieldset">
		<legend class="fieldset-legend">{m.calendarPlaceAddress()}</legend>
		<input type="text" bind:value={placeAddress} class="input w-full" />
	</fieldset>
	<fieldset class="fieldset">
		<legend class="fieldset-legend">{m.calendarPlacePlusCode()}</legend>
		<div class="flex gap-2">
			<input
				type="text"
				bind:value={placePlusCode}
				class="input flex-1"
				placeholder="e.g. 84W3+7X Kiel"
			/>
			<button
				type="button"
				class="btn btn-ghost btn-sm"
				onclick={decodePlusCode}
				disabled={!placePlusCode.trim() || plusCodeLoading}
			>
				{#if plusCodeLoading}
					<span class="loading loading-spinner loading-xs"></span>
				{:else}
					<i class="fas fa-location-crosshairs"></i>
				{/if}
			</button>
		</div>
		{#if plusCodeError}
			<p class="text-error mt-1 text-xs">{plusCodeError}</p>
		{/if}
		<p class="text-base-content/50 mt-1 text-xs">{m.calendarPlacePlusCodeHint()}</p>
	</fieldset>
	<div class="grid grid-cols-2 gap-4">
		<fieldset class="fieldset">
			<legend class="fieldset-legend">{m.calendarPlaceLatitude()}</legend>
			<input type="number" step="any" bind:value={placeLatitude} class="input w-full" />
		</fieldset>
		<fieldset class="fieldset">
			<legend class="fieldset-legend">{m.calendarPlaceLongitude()}</legend>
			<input type="number" step="any" bind:value={placeLongitude} class="input w-full" />
		</fieldset>
	</div>
	{#if placeLatitude && placeLongitude && !isNaN(parseFloat(placeLatitude)) && !isNaN(parseFloat(placeLongitude))}
		<div class="h-[200px] w-full overflow-hidden rounded-box">
			{#await import('sveaflet') then { Map, TileLayer, Marker }}
				<Map
					options={{
						center: [parseFloat(placeLatitude), parseFloat(placeLongitude)],
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
					<Marker latLng={[parseFloat(placeLatitude), parseFloat(placeLongitude)]} />
				</Map>
			{/await}
		</div>
	{/if}
	<fieldset class="fieldset">
		<legend class="fieldset-legend">{m.calendarPlaceDirections()}</legend>
		<textarea bind:value={placeDirections} class="textarea w-full"></textarea>
	</fieldset>
	<fieldset class="fieldset">
		<legend class="fieldset-legend">{m.calendarPlaceInfo()}</legend>
		<textarea bind:value={placeInfo} class="textarea w-full"></textarea>
	</fieldset>
	<fieldset class="fieldset">
		<legend class="fieldset-legend">{m.calendarPlaceWebsite()}</legend>
		<input type="url" bind:value={placeWebsiteUrl} class="input w-full" />
	</fieldset>
	<fieldset class="fieldset">
		<legend class="fieldset-legend">{m.calendarPlaceSitePlan()}</legend>
		<input
			type="file"
			accept="application/pdf"
			class="file-input w-full"
			onchange={handleSitePlanUpload}
		/>
		{#if sitePlanHref}
			<div class="mt-1 flex items-center gap-2">
				<span class="text-success text-xs">
					<i class="fas fa-check-circle"></i>
					PDF
				</span>
				<a
					href={sitePlanHref}
					rel="external"
					download="site-plan.pdf"
					class="link link-primary text-xs"
				>
					{m.calendarPlaceSitePlanDownload()}
				</a>
			</div>
		{/if}
	</fieldset>
</ActionModal>
