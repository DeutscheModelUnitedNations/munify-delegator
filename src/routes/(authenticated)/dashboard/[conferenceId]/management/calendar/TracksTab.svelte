<script lang="ts">
	import ActionModal from '$lib/components/ActionModal.svelte';
	import CalendarListTable from './CalendarListTable.svelte';
	import RowActionButton from './RowActionButton.svelte';
	import { client } from '$lib/api/rumbleClient/client';
	import { m } from '$lib/paraglide/messages';
	import ConfirmDeleteModal from '$lib/components/ConfirmDeleteModal.svelte';
	import DaySelect from './DaySelect.svelte';
	import { trackFields } from './calendarEditing';

	interface Props {
		conferenceId: string;
		selectedDayId: string | null;
	}

	let { conferenceId, selectedDayId = $bindable() }: Props = $props();

	const tracks = $derived(
		selectedDayId
			? await client.liveQuery.calendarTracks({
					__args: { where: { calendarDayId: { eq: selectedDayId } } },
					id: true,
					name: true,
					description: true,
					sortOrder: true
				})
			: []
	);

	type Track = (typeof tracks)[number];

	let isLoading = $state(false);
	let showTrackModal = $state(false);
	let trackToEdit = $state<Track | null>(null);
	let trackToDelete = $state<Track | null>(null);

	let trackName = $state('');
	let trackDescription = $state('');
	let trackSortOrder = $state(0);

	function openCreateTrack() {
		trackToEdit = null;
		trackName = '';
		trackDescription = '';
		trackSortOrder = tracks.length;
		showTrackModal = true;
	}

	function openEditTrack(track: Track) {
		trackToEdit = track;
		trackName = track.name;
		trackDescription = track.description ?? '';
		trackSortOrder = track.sortOrder;
		showTrackModal = true;
	}

	function closeTrackModal() {
		showTrackModal = false;
		trackToEdit = null;
	}

	/** Updates the track being edited, or creates one on the selected day, then closes the form. */
	async function writeTrack(fields: ReturnType<typeof trackFields>) {
		if (trackToEdit) {
			await client.mutate.updateCalendarTrack({
				__args: { id: trackToEdit.id, ...fields },
				id: true
			});
		} else {
			// Without a day there is nowhere to create the track; the form stays open.
			if (!selectedDayId) return;
			await client.mutate.createCalendarTrack({
				__args: { calendarDayId: selectedDayId, ...fields },
				id: true
			});
		}
		closeTrackModal();
	}

	async function saveTrack() {
		if (!trackName) return;
		isLoading = true;
		try {
			await writeTrack(trackFields(trackName, trackDescription, trackSortOrder));
		} catch (error) {
			console.error(trackToEdit ? 'Failed to update track:' : 'Failed to create track:', error);
		} finally {
			isLoading = false;
		}
	}

	async function deleteTrack() {
		if (!trackToDelete) return;
		try {
			await client.mutate.deleteCalendarTrack({ __args: { id: trackToDelete.id } });
			trackToDelete = null;
		} catch (error) {
			console.error('Failed to delete track:', error);
		}
	}
</script>

<div class="flex flex-wrap items-center justify-between gap-2">
	<DaySelect {conferenceId} bind:selectedDayId />
	<button class="btn btn-primary btn-sm" onclick={openCreateTrack} disabled={!selectedDayId}>
		<i class="fas fa-plus"></i>
		{m.calendarAddTrack()}
	</button>
</div>

<CalendarListTable
	empty={tracks.length === 0}
	emptyIcon="fa-columns"
	emptyText={m.calendarNoTracks()}
	headers={[m.calendarSortOrder(), m.name(), m.description(), m.actions()]}
>
	{#each tracks as track (track.id)}
		<tr>
			<td>{track.sortOrder}</td>
			<td>{track.name}</td>
			<td class="max-w-xs truncate">{track.description ?? '–'}</td>
			<td class="flex gap-2">
				<RowActionButton
					icon="fa-edit"
					label={m.calendarEditTrack()}
					onclick={() => openEditTrack(track)}
				/>
				<RowActionButton
					icon="fa-trash"
					label={m.calendarDeleteTrack()}
					danger
					onclick={() => (trackToDelete = track)}
				/>
			</td>
		</tr>
	{/each}
</CalendarListTable>

{#if showTrackModal}
	<ActionModal
		title={trackToEdit ? m.calendarEditTrack() : m.calendarAddTrack()}
		confirmLabel={trackToEdit ? m.save() : m.create()}
		confirmDisabled={!trackName}
		loading={isLoading}
		onConfirm={saveTrack}
		onClose={closeTrackModal}
	>
		<fieldset class="fieldset">
			<legend class="fieldset-legend">{m.name()}</legend>
			<input type="text" bind:value={trackName} class="input w-full" required />
		</fieldset>
		<fieldset class="fieldset">
			<legend class="fieldset-legend">{m.description()}</legend>
			<textarea bind:value={trackDescription} class="textarea w-full"></textarea>
		</fieldset>
		<fieldset class="fieldset">
			<legend class="fieldset-legend">{m.calendarSortOrder()}</legend>
			<input type="number" bind:value={trackSortOrder} class="input w-full" min="0" />
		</fieldset>
	</ActionModal>
{/if}

{#if trackToDelete}
	<ConfirmDeleteModal
		title={m.calendarDeleteTrack()}
		text={m.calendarConfirmDeleteTrack()}
		onConfirm={deleteTrack}
		onClose={() => (trackToDelete = null)}
	/>
{/if}
