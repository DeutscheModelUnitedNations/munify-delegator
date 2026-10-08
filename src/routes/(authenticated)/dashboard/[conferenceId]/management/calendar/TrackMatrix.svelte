<!-- fallow-ignore-file complexity -->
<script lang="ts">
	import { SvelteSet } from 'svelte/reactivity';
	import { toast } from 'svelte-sonner';
	import ConfirmDeleteModal from '$lib/components/ConfirmDeleteModal.svelte';
	import { client } from '$lib/api/rumbleClient/client';
	import { m } from '$lib/paraglide/messages';
	import RowActionButton from './RowActionButton.svelte';
	import TrackRowFormModal from './TrackRowFormModal.svelte';
	import { exportCalendarDay } from './exportCalendarDay';
	import { trackRows, rowOrderChanges, type MatrixDay, type TrackRow } from './trackMatrix';

	interface Props {
		days: MatrixDay[];
		onCopyEntries: (day: MatrixDay) => void;
		onEdit: (day: MatrixDay) => void;
		onDelete: (day: MatrixDay) => void;
	}

	let { days, onCopyEntries, onEdit, onDelete }: Props = $props();

	const liveRows = $derived(trackRows(days));
	/** Rows whose last track was unticked: they stay in the matrix so they can be ticked again */
	let ghosts = $state<{ row: TrackRow; index: number }[]>([]);
	const rows = $derived.by(() => {
		const result = [...liveRows];
		const names = new Set(result.map((row) => row.name));
		for (const ghost of ghosts) {
			if (names.has(ghost.row.name)) continue;
			result.splice(Math.min(ghost.index, result.length), 0, ghost.row);
		}
		return result;
	});

	/** Remembers the rows that would vanish once `tracks` are removed. */
	function keepRows(tracks: MatrixDay['tracks']) {
		const removed = new Set(tracks.map((t) => t.id));
		const gone = new Set(
			rows
				.map((row) => row.name)
				.filter((name) =>
					days.flatMap((d) => d.tracks).every((t) => t.name !== name || removed.has(t.id))
				)
		);
		const kept = rows.flatMap((row, index) => (gone.has(row.name) ? [{ row, index }] : []));
		ghosts = [...ghosts.filter((g) => !gone.has(g.row.name)), ...kept];
	}

	/** The open row form: empty adds a track to every day, `row` edits that one */
	let rowForm = $state<{ row?: TrackRow } | null>(null);
	/** Tracks waiting for the confirmation to be removed */
	let removal = $state<{ tracks: MatrixDay['tracks']; keep: boolean; entryCount: number } | null>(
		null
	);
	/** Cells with a write in flight, as `rowName|dayId` */
	const busy = new SvelteSet<string>();

	const showError = (error: unknown) =>
		toast.error(error instanceof Error ? error.message : m.genericToastError());

	const cellKey = (row: TrackRow, day: MatrixDay) => `${row.name}|${day.id}`;

	async function create(row: TrackRow, day: MatrixDay, index: number) {
		await client.mutate.createCalendarTrack({
			__args: {
				calendarDayId: day.id,
				name: row.name,
				description: row.description,
				sortOrder: index
			},
			id: true
		});
	}

	async function toggle(row: TrackRow, day: MatrixDay, index: number) {
		const existing = day.tracks.filter((t) => t.name === row.name);
		if (existing.length > 0) {
			askRemoval(existing);
			return;
		}
		const key = cellKey(row, day);
		busy.add(key);
		try {
			await create(row, day, index);
		} catch (error) {
			showError(error);
		} finally {
			busy.delete(key);
		}
	}

	function askRemoval(tracks: MatrixDay['tracks'], keep = true) {
		const entryIds = new Set(tracks.flatMap((t) => t.entries.map((e) => e.id)));
		if (entryIds.size === 0) {
			void remove(tracks, keep);
			return;
		}
		removal = { tracks, keep, entryCount: entryIds.size };
	}

	async function remove(tracks: MatrixDay['tracks'], keep: boolean) {
		if (keep) keepRows(tracks);
		const ids = tracks.map((t) => t.id);
		try {
			await Promise.all(ids.map((id) => client.mutate.deleteCalendarTrack({ __args: { id } })));
		} catch (error) {
			showError(error);
		}
	}

	async function confirmRemoval() {
		if (!removal) return;
		await remove(removal.tracks, removal.keep);
		removal = null;
	}

	async function selectAll() {
		try {
			await Promise.all(
				rows.flatMap((row, index) =>
					days
						.filter((day) => !day.tracks.some((t) => t.name === row.name))
						.map((day) => create(row, day, index))
				)
			);
		} catch (error) {
			showError(error);
		}
	}

	/** Takes a whole row out of the matrix, from every day. */
	function deleteRow(row: TrackRow) {
		ghosts = ghosts.filter((g) => g.row.name !== row.name);
		askRemoval(
			days.flatMap((day) => day.tracks.filter((t) => t.name === row.name)),
			false
		);
	}

	function deselectAll() {
		askRemoval(days.flatMap((day) => day.tracks));
	}

	/** The row being dragged and the row index it would land on */
	let dragged = $state<string | null>(null);
	let dropIndex = $state<number | null>(null);

	function endDrag() {
		dragged = null;
		dropIndex = null;
	}

	async function dropRow(toIndex: number) {
		const name = dragged;
		endDrag();
		if (name !== null) await moveRow(name, toIndex);
	}

	async function moveRow(name: string, toIndex: number) {
		const changes = rowOrderChanges(days, rows, name, toIndex);
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
		<button class="btn btn-ghost btn-sm" disabled={rows.length === 0} onclick={selectAll}>
			<i class="fas fa-square-check"></i>
			{m.calendarSelectAllTracks()}
		</button>
		<button class="btn btn-ghost btn-sm" disabled={rows.length === 0} onclick={deselectAll}>
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
							{new Date(day.date).toLocaleDateString(undefined, {
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
			{#each rows as row, index (row.name)}
				<tr
					class="hover:bg-base-200/50 {dragged === row.name ? 'opacity-40' : ''} {dropIndex ===
						index &&
					dragged !== null &&
					dragged !== row.name
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
									dragged = row.name;
									event.dataTransfer?.setData('text/plain', row.name);
									if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
								}}
								ondragend={endDrag}
							>
								<i class="fas fa-grip-vertical"></i>
							</span>
							<div class="min-w-0 grow">
								<div class="font-medium">{row.name}</div>
								{#if row.description}
									<div class="text-base-content/60 max-w-64 truncate text-xs">
										{row.description}
									</div>
								{/if}
							</div>
							<button
								class="btn btn-ghost btn-xs"
								aria-label={m.calendarEditTrack()}
								title={m.calendarEditTrack()}
								onclick={() => (rowForm = { row })}
							>
								<i class="fas fa-edit"></i>
							</button>
							<button
								class="btn btn-ghost btn-error btn-xs"
								aria-label={m.calendarDeleteTrack()}
								title={m.calendarDeleteTrack()}
								onclick={() => deleteRow(row)}
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
								aria-label="{row.name} · {day.name}"
								checked={day.tracks.some((t) => t.name === row.name)}
								disabled={busy.has(cellKey(row, day))}
								onchange={() => toggle(row, day, index)}
							/>
						</td>
					{/each}
				</tr>
			{/each}
			{#if rows.length === 0}
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
		<TrackRowFormModal {days} {rows} row={rowForm.row} onClose={() => (rowForm = null)} />
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
