<!-- fallow-ignore-file complexity -->
<script lang="ts">
	import { getLocale } from '#lib/paraglide/runtime';
	import { SvelteSet } from 'svelte/reactivity';
	import { toast } from 'svelte-sonner';
	import ConfirmDeleteModal from '#lib/components/ConfirmDeleteModal.svelte';
	import { client } from '#lib/api/rumbleClient/client';
	import { m } from '#lib/paraglide/messages';
	import RowActionButton from './RowActionButton.svelte';
	import TrackRowFormModal from './TrackRowFormModal.svelte';
	import { exportCalendarDay } from './exportCalendarDay';
	import {
		entriesOnDays,
		rowOrderChanges,
		runsOn,
		type MatrixDay,
		type MatrixTrack
	} from './trackMatrix';

	interface Props {
		conferenceId: string;
		days: MatrixDay[];
		/** The conference's tracks, in their order */
		tracks: MatrixTrack[];
		onCopyEntries: (day: MatrixDay) => void;
		onEdit: (day: MatrixDay) => void;
		onDelete: (day: MatrixDay) => void;
	}

	let { conferenceId, days, tracks, onCopyEntries, onEdit, onDelete }: Props = $props();

	/** One track on one day */
	interface Cell {
		track: MatrixTrack;
		day: MatrixDay;
	}

	/** The open row form: empty adds a track, `track` edits that one */
	let rowForm = $state<{ track?: MatrixTrack } | null>(null);
	/** What waits for the confirmation to be removed: cells, or a whole track */
	let removal = $state<
		| { kind: 'cells'; cells: Cell[]; entryCount: number }
		| { kind: 'track'; track: MatrixTrack; entryCount: number }
		| null
	>(null);
	/** Cells with a write in flight, as `trackId|dayId` */
	const busy = new SvelteSet<string>();

	const showError = (error: unknown) =>
		toast.error(error instanceof Error ? error.message : m.genericToastError());

	const cellKey = ({ track, day }: Cell) => `${track.id}|${day.id}`;

	async function setRuns({ cells, runs }: { cells: Cell[]; runs: boolean }) {
		const keys = cells.map(cellKey);
		for (const key of keys) busy.add(key);
		try {
			await Promise.all(
				cells.map(({ track, day }) =>
					client.mutate.setCalendarTrackOnDay({
						__args: { id: track.id, calendarDayId: day.id, runs }
					})
				)
			);
		} catch (error) {
			showError(error);
		} finally {
			for (const key of keys) busy.delete(key);
		}
	}

	/** Takes the cells' tracks off their days, asking first when entries would go with them. */
	function askRemoval(cells: Cell[]) {
		if (cells.length === 0) return;
		const entryCount = new Set(
			cells.flatMap(({ track, day }) => [...entriesOnDays({ tracks: [track], dayIds: [day.id] })])
		).size;
		if (entryCount === 0) {
			void setRuns({ cells, runs: false });
			return;
		}
		removal = { kind: 'cells', cells, entryCount };
	}

	function toggle(cell: Cell) {
		if (runsOn(cell)) askRemoval([cell]);
		else void setRuns({ cells: [cell], runs: true });
	}

	const allCells = $derived(tracks.flatMap((track) => days.map((day) => ({ track, day }))));

	function selectAll() {
		void setRuns({ cells: allCells.filter((cell) => !runsOn(cell)), runs: true });
	}

	function deselectAll() {
		askRemoval(allCells.filter(runsOn));
	}

	/** Deletes a track from the conference, from every day. */
	function deleteTrack(track: MatrixTrack) {
		removal = { kind: 'track', track, entryCount: track.entries.length };
	}

	async function confirmRemoval() {
		if (!removal) return;
		const pending = removal;
		removal = null;
		if (pending.kind === 'cells') {
			await setRuns({ cells: pending.cells, runs: false });
			return;
		}
		try {
			await client.mutate.deleteCalendarTrack({ __args: { id: pending.track.id } });
		} catch (error) {
			showError(error);
		}
	}

	/** The track being dragged and the row index it would land on */
	let dragged = $state<string | null>(null);
	let dropIndex = $state<number | null>(null);

	function endDrag() {
		dragged = null;
		dropIndex = null;
	}

	async function dropRow(toIndex: number) {
		const trackId = dragged;
		endDrag();
		if (trackId !== null) await moveRow({ trackId, toIndex });
	}

	async function moveRow({ trackId, toIndex }: { trackId: string; toIndex: number }) {
		const changes = rowOrderChanges({ tracks, trackId, toIndex });
		try {
			await Promise.all(
				changes.map((change) =>
					client.mutate.updateCalendarTrack({
						__args: { id: change.id, sortOrder: change.sortOrder },
						id: true
					})
				)
			);
		} catch (error) {
			showError(error);
		}
	}
</script>

<div class="mb-2 flex flex-wrap items-center justify-between gap-2">
	<div class="flex gap-1">
		<button class="btn btn-ghost btn-sm" disabled={tracks.length === 0} onclick={selectAll}>
			<i class="fas fa-square-check"></i>
			{m.calendarSelectAllTracks()}
		</button>
		<button class="btn btn-ghost btn-sm" disabled={tracks.length === 0} onclick={deselectAll}>
			<i class="fas fa-square"></i>
			{m.calendarDeselectAllTracks()}
		</button>
	</div>
	<button class="btn btn-ghost btn-sm" onclick={() => (rowForm = {})}>
		<i class="fas fa-plus"></i>
		{m.calendarAddTrack()}
	</button>
</div>

<div class="bg-base-100 border-base-300 rounded-box overflow-x-auto border">
	<table class="table">
		<thead>
			<tr>
				<th class="align-bottom">{m.calendarTracks()}</th>
				{#each days as day (day.id)}
					<th class="min-w-44 align-bottom font-normal">
						<div class="font-bold">{day.name}</div>
						<div class="text-base-content/60 text-xs">
							{new Date(day.date).toLocaleDateString(getLocale(), {
								weekday: 'short',
								day: '2-digit',
								month: '2-digit',
								year: 'numeric',
								timeZone: 'UTC'
							})}
							· {day.entries.length}
							{m.calendarEntries()}
						</div>
						<div class="mt-1 flex">
							<RowActionButton
								icon="fa-clone"
								label={m.calendarCopyDayEntries()}
								onclick={() => onCopyEntries(day)}
							/>
							<RowActionButton
								icon="fa-download"
								label={m.calendarExportDay()}
								onclick={() => exportCalendarDay(day.id)}
							/>
							<RowActionButton
								icon="fa-edit"
								label={m.calendarEditDay()}
								onclick={() => onEdit(day)}
							/>
							<RowActionButton
								icon="fa-trash"
								label={m.calendarDeleteDay()}
								danger
								onclick={() => onDelete(day)}
							/>
						</div>
					</th>
				{/each}
			</tr>
		</thead>
		<tbody>
			{#each tracks as track, index (track.id)}
				<tr
					class="hover:bg-base-200/50 {dragged === track.id ? 'opacity-40' : ''} {dropIndex ===
						index &&
					dragged !== null &&
					dragged !== track.id
						? 'outline-primary outline-2 -outline-offset-2'
						: ''}"
					ondragover={(event) => {
						if (dragged === null) return;
						event.preventDefault();
						dropIndex = index;
					}}
					ondrop={(event) => {
						event.preventDefault();
						void dropRow(index);
					}}
				>
					<td>
						<div class="flex items-center gap-2">
							<span
								class="text-base-content/50 cursor-grab"
								role="button"
								tabindex="-1"
								aria-label={m.calendarDragTrack()}
								title={m.calendarDragTrack()}
								draggable="true"
								ondragstart={(event) => {
									dragged = track.id;
									event.dataTransfer?.setData('text/plain', track.name);
									if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
								}}
								ondragend={endDrag}
							>
								<i class="fas fa-grip-vertical"></i>
							</span>
							<div class="min-w-0 grow">
								<div class="font-medium">{track.name}</div>
								{#if track.description}
									<div class="text-base-content/60 max-w-64 truncate text-xs">
										{track.description}
									</div>
								{/if}
							</div>
							<button
								class="btn btn-ghost btn-xs"
								aria-label={m.calendarEditTrack()}
								title={m.calendarEditTrack()}
								onclick={() => (rowForm = { track })}
							>
								<i class="fas fa-edit"></i>
							</button>
							<button
								class="btn btn-ghost btn-error btn-xs"
								aria-label={m.calendarDeleteTrack()}
								title={m.calendarDeleteTrack()}
								onclick={() => deleteTrack(track)}
							>
								<i class="fas fa-trash"></i>
							</button>
						</div>
					</td>
					{#each days as day (day.id)}
						<td>
							<input
								type="checkbox"
								class="checkbox checkbox-primary"
								aria-label="{track.name} · {day.name}"
								checked={runsOn({ track, day })}
								disabled={busy.has(cellKey({ track, day }))}
								onchange={() => toggle({ track, day })}
							/>
						</td>
					{/each}
				</tr>
			{/each}
			{#if tracks.length === 0}
				<tr>
					<td colspan={days.length + 1} class="text-base-content/60 text-sm">
						{m.calendarNoTracks()}
					</td>
				</tr>
			{/if}
		</tbody>
	</table>
</div>

{#if rowForm}
	{#key rowForm}
		<TrackRowFormModal
			{conferenceId}
			{days}
			{tracks}
			track={rowForm.track}
			onClose={() => (rowForm = null)}
		/>
	{/key}
{/if}

{#if removal}
	<ConfirmDeleteModal
		title={m.calendarDeleteTrack()}
		text={removal.entryCount > 0
			? m.calendarConfirmRemoveTracksWithEntries({ count: removal.entryCount })
			: m.calendarConfirmDeleteTrack()}
		onConfirm={confirmRemoval}
		onClose={() => (removal = null)}
	/>
{/if}
