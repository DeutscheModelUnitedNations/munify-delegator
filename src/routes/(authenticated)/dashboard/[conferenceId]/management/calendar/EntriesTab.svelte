<script lang="ts">
	import { client } from '$lib/api/rumbleClient/client';
	import { m } from '$lib/paraglide/messages';
	import { translateCalendarEntryColor } from '$lib/utils/enumTranslations';
	import ConfirmDeleteModal from '$lib/components/ConfirmDeleteModal.svelte';
	import CalendarListTable from './CalendarListTable.svelte';
	import RowActionButton from './RowActionButton.svelte';
	import CopyDayEntriesModal from './CopyDayEntriesModal.svelte';
	import DaySelect from './DaySelect.svelte';
	import EntryFormModal from './EntryFormModal.svelte';
	import MoveEntryModal from './MoveEntryModal.svelte';
	import { findOverlappingEntryIds, sortEntriesByTimeAndTrack } from './calendarEditing';

	interface Props {
		conferenceId: string;
		selectedDayId: string | null;
	}

	let { conferenceId, selectedDayId = $bindable() }: Props = $props();

	// The days only to know whether there is another day to copy to, and the selected day's
	// tracks and entries - in one derived, so neither waits on the other.
	const [dayIds, selectedDay] = $derived(
		await Promise.all([
			client.liveQuery.calendarDays({
				__args: { where: { conferenceId: { eq: conferenceId } } },
				id: true
			}),
			selectedDayId
				? client.liveQuery.calendarDay({
						__args: { id: selectedDayId },
						id: true,
						name: true,
						tracks: { id: true, name: true, sortOrder: true },
						entries: {
							id: true,
							startTime: true,
							endTime: true,
							name: true,
							fontAwesomeIcon: true,
							color: true,
							calendarTrackId: true
						}
					})
				: undefined
		])
	);

	let tracks = $derived(selectedDay?.tracks ?? []);
	let filterEntryTrackId = $state<string | null>(null);
	let sortedEntriesForSelectedDay = $derived(
		sortEntriesByTimeAndTrack(selectedDay?.entries ?? [], tracks)
	);
	let entriesForSelectedDay = $derived(
		filterEntryTrackId
			? sortedEntriesForSelectedDay.filter((e) => e.calendarTrackId === filterEntryTrackId)
			: sortedEntriesForSelectedDay
	);

	type Entry = (typeof sortedEntriesForSelectedDay)[number];

	// Detect overlapping entries (same track, overlapping time ranges)
	let overlappingEntryIds = $derived(findOverlappingEntryIds(sortedEntriesForSelectedDay));

	// Reset track filter when day changes
	$effect(() => {
		void selectedDayId;
		filterEntryTrackId = null;
	});

	/** The open form: empty creates an entry, `entryId` edits one, plus `duplicate` copies it. */
	let entryModal = $state<{ entryId?: string; duplicate?: boolean } | null>(null);
	let entryToDelete = $state<Entry | null>(null);
	let entryToMove = $state<Entry | null>(null);
	let showCopyDayModal = $state(false);

	async function deleteEntry() {
		if (!entryToDelete) return;
		try {
			await client.mutate.deleteCalendarEntry({ __args: { id: entryToDelete.id } });
			entryToDelete = null;
		} catch (error) {
			console.error('Failed to delete entry:', error);
		}
	}

	/** An entry's time of day; entries store wall-clock times as UTC. */
	function formatTime(time: Date | string) {
		return new Date(time).toLocaleTimeString([], {
			hour: '2-digit',
			minute: '2-digit',
			timeZone: 'UTC'
		});
	}
</script>

{#snippet entryRow(entry: (typeof entriesForSelectedDay)[number])}
	{@const track = tracks.find((t) => t.id === entry.calendarTrackId)}
	{@const hasOverlap = overlappingEntryIds.has(entry.id)}
	<tr class={hasOverlap ? 'bg-warning/10' : ''}>
		<td>
			<div class="flex items-center gap-1.5">
				{#if hasOverlap}
					<div class="tooltip tooltip-right" data-tip={m.calendarEntryOverlap()}>
						<i class="fa-solid fa-triangle-exclamation text-warning text-xs"></i>
					</div>
				{/if}
				{#if entry.fontAwesomeIcon}
					<i class="fa-duotone fa-{entry.fontAwesomeIcon}"></i>
				{/if}
				{entry.name}
			</div>
		</td>
		<td>{formatTime(entry.startTime)}</td>
		<td>{formatTime(entry.endTime)}</td>
		<td>{track?.name ?? m.calendarAllTracks()}</td>
		<td><span class="badge badge-sm">{translateCalendarEntryColor(entry.color)}</span></td>
		<td class="flex gap-2">
			<RowActionButton
				icon="fa-copy"
				label={m.calendarAddEntry()}
				onclick={() => (entryModal = { entryId: entry.id, duplicate: true })}
			/>
			<RowActionButton
				icon="fa-calendar-arrow-down"
				label={m.calendarChangeDay()}
				onclick={() => (entryToMove = entry)}
			/>
			<RowActionButton
				icon="fa-edit"
				label={m.calendarEditEntry()}
				onclick={() => (entryModal = { entryId: entry.id })}
			/>
			<RowActionButton
				icon="fa-trash"
				label={m.calendarDeleteEntry()}
				danger
				onclick={() => (entryToDelete = entry)}
			/>
		</td>
	</tr>
{/snippet}

<div class="flex flex-wrap items-center justify-between gap-2">
	<div class="flex flex-wrap items-center gap-2">
		<DaySelect {conferenceId} bind:selectedDayId />
		{#if tracks.length > 1}
			<select class="select select-bordered select-sm" bind:value={filterEntryTrackId}>
				<option value={null}>{m.calendarAllTracks()}</option>
				{#each tracks as track (track.id)}
					<option value={track.id}>{track.name}</option>
				{/each}
			</select>
		{/if}
	</div>
	<div class="flex items-center gap-2">
		<button
			class="btn btn-ghost btn-sm"
			onclick={() => (showCopyDayModal = true)}
			disabled={!selectedDayId || sortedEntriesForSelectedDay.length === 0 || dayIds.length < 2}
		>
			<i class="fas fa-clone"></i>
			{m.calendarCopyDayEntries()}
		</button>
		<button
			class="btn btn-primary btn-sm"
			onclick={() => (entryModal = {})}
			disabled={!selectedDayId}
		>
			<i class="fas fa-plus"></i>
			{m.calendarAddEntry()}
		</button>
	</div>
</div>

<CalendarListTable
	empty={entriesForSelectedDay.length === 0}
	emptyIcon="fa-rectangle-list"
	emptyText={m.calendarNoEntries()}
	headers={[
		m.name(),
		m.calendarStartTime(),
		m.calendarEndTime(),
		m.calendarTrack(),
		m.calendarColor(),
		m.actions()
	]}
>
	{#each entriesForSelectedDay as entry (entry.id)}
		{@render entryRow(entry)}
	{/each}
</CalendarListTable>

{#if entryModal && selectedDayId}
	{#key entryModal}
		<EntryFormModal
			{conferenceId}
			dayId={selectedDayId}
			entryId={entryModal.entryId}
			duplicate={entryModal.duplicate}
			onClose={() => (entryModal = null)}
		/>
	{/key}
{/if}

{#if entryToDelete}
	<ConfirmDeleteModal
		title={m.calendarDeleteEntry()}
		text={m.calendarConfirmDeleteEntry()}
		onConfirm={deleteEntry}
		onClose={() => (entryToDelete = null)}
	/>
{/if}

{#if entryToMove && selectedDayId}
	<MoveEntryModal
		{conferenceId}
		currentDayId={selectedDayId}
		entry={entryToMove}
		onClose={() => (entryToMove = null)}
	/>
{/if}

{#if showCopyDayModal && selectedDay}
	<CopyDayEntriesModal
		{conferenceId}
		dayId={selectedDay.id}
		dayName={selectedDay.name}
		entryCount={selectedDay.entries.length}
		onClose={() => (showCopyDayModal = false)}
	/>
{/if}
