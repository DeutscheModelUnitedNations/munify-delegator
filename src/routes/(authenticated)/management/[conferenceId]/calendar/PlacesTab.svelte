<script lang="ts">
	import { client } from '$lib/api/rumbleClient/client';
	import { m } from '$lib/paraglide/messages';
	import ConfirmDeleteModal from '$lib/components/ConfirmDeleteModal.svelte';
	import CalendarListTable from './CalendarListTable.svelte';
	import RowActionButton from './RowActionButton.svelte';
	import PlaceFormModal from './PlaceFormModal.svelte';

	interface Props {
		conferenceId: string;
	}

	let { conferenceId }: Props = $props();

	const places = $derived(
		await client.liveQuery.places({
			__args: {
				where: { conferenceId: { eq: conferenceId } },
				orderBy: { name: 'asc' }
			},
			id: true,
			name: true,
			address: true,
			latitude: true,
			longitude: true,
			// Whether there is a site plan, not the plan itself: it is an uploaded file and can be large.
			hasSitePlan: true
		})
	);

	type Place = (typeof places)[number];

	/** The open form: an empty object creates a place, a `placeId` edits that one. */
	let placeModal = $state<{ placeId?: string } | null>(null);
	let placeToDelete = $state<Place | null>(null);

	async function deletePlace() {
		if (!placeToDelete) return;
		try {
			await client.mutate.deletePlace({ __args: { id: placeToDelete.id } });
			placeToDelete = null;
		} catch (error) {
			console.error('Failed to delete place:', error);
		}
	}

	function formatCoordinates(place: { latitude: number | null; longitude: number | null }) {
		if (place.latitude == null || place.longitude == null) return '–';
		return `${place.latitude.toFixed(4)}, ${place.longitude.toFixed(4)}`;
	}
</script>

<div class="flex justify-end">
	<button class="btn btn-primary btn-sm" onclick={() => (placeModal = {})}>
		<i class="fas fa-plus"></i>
		{m.calendarAddPlace()}
	</button>
</div>

<CalendarListTable
	empty={places.length === 0}
	emptyIcon="fa-location-dot"
	emptyText={m.calendarNoPlaces()}
	headers={[
		m.calendarPlaceName(),
		m.calendarPlaceAddress(),
		`${m.calendarPlaceLatitude()} / ${m.calendarPlaceLongitude()}`,
		m.calendarPlaceSitePlan(),
		m.actions()
	]}
>
	{#snippet emptyAction()}
		<button class="btn btn-primary mt-4" onclick={() => (placeModal = {})}>
			<i class="fas fa-plus"></i>
			{m.calendarAddPlace()}
		</button>
	{/snippet}
	{#each places as place (place.id)}
		<tr>
			<td>{place.name}</td>
			<td class="max-w-xs truncate">{place.address ?? '–'}</td>
			<td>{formatCoordinates(place)}</td>
			<td>
				{#if place.hasSitePlan}
					<i class="fas fa-file-pdf text-success"></i>
				{:else}
					–
				{/if}
			</td>
			<td class="flex gap-2">
				<RowActionButton
					icon="fa-edit"
					label={m.calendarEditPlace()}
					onclick={() => (placeModal = { placeId: place.id })}
				/>
				<RowActionButton
					icon="fa-trash"
					label={m.calendarDeletePlace()}
					danger
					onclick={() => (placeToDelete = place)}
				/>
			</td>
		</tr>
	{/each}
</CalendarListTable>

{#if placeModal}
	{#key placeModal}
		<PlaceFormModal
			{conferenceId}
			placeId={placeModal.placeId}
			onClose={() => (placeModal = null)}
		/>
	{/key}
{/if}

{#if placeToDelete}
	<ConfirmDeleteModal
		title={m.calendarDeletePlace()}
		text={m.calendarConfirmDeletePlace()}
		onConfirm={deletePlace}
		onClose={() => (placeToDelete = null)}
	/>
{/if}
