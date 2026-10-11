<script lang="ts">
	import { formatClockMinutes } from '$lib/helpers/formatClock';
	import { toast } from 'svelte-sonner';
	import { client } from '$lib/api/rumbleClient/client';
	import ConfirmDeleteModal from '$lib/components/ConfirmDeleteModal.svelte';
	import { m } from '$lib/paraglide/messages';
	import {
		CalendarEditor,
		toEditorDay,
		type EditorDay,
		type PointerPosition
	} from './calendarEditor.svelte';
	import {
		columnIndexAt,
		entryExtent,
		keyAction,
		minutesAtOffset,
		type DragMode
	} from './calendarGrid';
	import EditorEntryCard from './EditorEntryCard.svelte';
	import EntryFormModal from './EntryFormModal.svelte';

	interface Props {
		conferenceId: string;
		/** Opens the tab where days are added */
		onOpenDays: () => void;
	}

	let { conferenceId, onOpenDays }: Props = $props();

	/** Pixels per hour; a quarter hour is a snap step */
	const HOUR_HEIGHT = 72;

	const days = $derived(
		await client.liveQuery.calendarDays({
			__args: {
				where: { conferenceId: { eq: conferenceId } },
				orderBy: { sortOrder: 'asc' }
			},
			id: true,
			name: true,
			date: true,
			tracks: { id: true, name: true, description: true, sortOrder: true },
			entries: {
				id: true,
				name: true,
				startTime: true,
				endTime: true,
				fontAwesomeIcon: true,
				color: true,
				room: true,
				tracks: { id: true },
				place: { name: true }
			}
		})
	);

	// A plain copy of what the editor works over: it reads every field of every entry, which on
	// the live results would subscribe to each one separately.
	const editorDays = $derived<EditorDay[]>(days.map(toEditorDay));

	const editor = new CalendarEditor(() => editorDays);

	// Saved moves drop out of the overlay once the live data shows them
	$effect(() => editor.settle());

	const grid = $derived(editor.grid);
	const hours = $derived(
		Array.from(
			{ length: editor.range.endHour - editor.range.startHour },
			(_, i) => editor.range.startHour + i
		)
	);
	const gridHeight = $derived(hours.length * HOUR_HEIGHT);
	const percent = (units: number) => `${(units / grid.totalUnits) * 100}%`;

	function entryStyle(entry: (typeof editor.entries)[number]) {
		const extent = entryExtent(grid, entry);
		if (!extent) return 'display: none;';
		const { lane, lanes } = editor.laneOf(entry.id);
		const laneWidth = extent.width / lanes;
		const top = ((entry.start - editor.range.startHour * 60) / 60) * HOUR_HEIGHT;
		const height = ((entry.end - entry.start) / 60) * HOUR_HEIGHT;
		return `top: ${top}px; height: ${height - 1}px; left: calc(${percent(extent.start + lane * laneWidth)} + 1px); width: calc(${percent(laneWidth)} - 2px);`;
	}

	function creatingStyle(creating: NonNullable<typeof editor.creating>) {
		const extent = entryExtent(grid, creating);
		if (!extent) return 'display: none;';
		const top = ((creating.span.start - editor.range.startHour * 60) / 60) * HOUR_HEIGHT;
		const height = ((creating.span.end - creating.span.start) / 60) * HOUR_HEIGHT;
		return `top: ${top}px; height: ${height}px; left: ${percent(extent.start)}; width: ${percent(extent.width)};`;
	}

	// === Pointer gestures ===

	let layer = $state<HTMLElement>();
	/** Where the current press started, in client pixels */
	let press: { x: number; y: number } | null = null;

	function pointerPosition(event: PointerEvent): PointerPosition {
		if (!layer) return { minutes: 0, unit: 0 };
		const rect = layer.getBoundingClientRect();
		return {
			minutes: minutesAtOffset(event.clientY - rect.top, HOUR_HEIGHT, editor.range.startHour),
			unit: ((event.clientX - rect.left) / rect.width) * grid.totalUnits
		};
	}

	const RESIZE_MODES: Record<string, DragMode> = {
		start: 'resize-start',
		end: 'resize-end',
		left: 'resize-left',
		right: 'resize-right'
	};

	function resizeMode(target: Element): DragMode {
		const edge = target instanceof HTMLElement ? target.dataset.resize : undefined;
		return (edge && RESIZE_MODES[edge]) || 'move';
	}

	/** Starts a gesture on the card under the pointer, or on the empty slot there. */
	function beginGesture(target: Element, position: PointerPosition) {
		const card = target.closest<HTMLElement>('[data-entry-id]');
		if (card?.dataset.entryId) {
			editor.beginEntryDrag(card.dataset.entryId, resizeMode(target), position);
			card.focus();
			return true;
		}
		const column = columnIndexAt(grid, position.unit);
		if (!column) return false;
		editor.beginCreate(column.block.dayId, column.index, position.minutes);
		return true;
	}

	/** The element a primary-button press landed on. */
	function pressTarget(event: PointerEvent) {
		return event.button === 0 && event.target instanceof Element ? event.target : null;
	}

	function onPointerDown(event: PointerEvent) {
		const target = pressTarget(event);
		if (!target || !layer || !beginGesture(target, pointerPosition(event))) return;
		press = { x: event.clientX, y: event.clientY };
		// All later events of the gesture come to the layer, wherever the card is drawn meanwhile
		layer.setPointerCapture(event.pointerId);
	}

	function onPointerMove(event: PointerEvent) {
		if (!editor.drag || !press) return;
		editor.moveDrag(
			pointerPosition(event),
			Math.hypot(event.clientX - press.x, event.clientY - press.y)
		);
	}

	function onPointerUp() {
		if (!press) return;
		press = null;
		const outcome = editor.finishDrag();
		if (outcome.type === 'click') {
			entryModal = { entryId: outcome.entryId };
		} else if (outcome.type === 'create') {
			entryModal = {
				initial: {
					dayId: outcome.dayId,
					trackIds: outcome.trackIds,
					start: outcome.span.start,
					end: outcome.span.end
				}
			};
		}
	}

	function cancelGesture() {
		press = null;
		editor.cancelDrag();
	}

	function runKeyAction(entryId: string, action: NonNullable<ReturnType<typeof keyAction>>) {
		if (action.type === 'open') entryModal = { entryId };
		else if (action.type === 'delete') entryToDelete = entryId;
		else editor.nudge(entryId, action.mode, action.axis, action.direction);
	}

	function onKeyDown(event: KeyboardEvent) {
		const target = event.target;
		const entryId = target instanceof HTMLElement ? target.dataset.entryId : undefined;
		const action = keyAction(event.key, event.shiftKey);
		if (entryId === undefined || !action) return;
		event.preventDefault();
		runKeyAction(entryId, action);
	}

	// === Forms ===

	let entryModal = $state<{
		entryId?: string;
		duplicate?: boolean;
		initial?: { dayId: string; trackIds: string[]; start: number; end: number };
	} | null>(null);
	let entryToDelete = $state<string | null>(null);

	async function deleteEntry() {
		if (!entryToDelete) return;
		try {
			await client.mutate.deleteCalendarEntry({ __args: { id: entryToDelete } });
			entryToDelete = null;
		} catch (error) {
			toast.error(error instanceof Error ? error.message : m.genericToastError());
		}
	}

	const dateFormat = new Intl.DateTimeFormat(undefined, {
		weekday: 'short',
		day: '2-digit',
		month: '2-digit',
		timeZone: 'UTC'
	});
</script>

<svelte:window
	onkeydown={(event) => {
		if (event.key === 'Escape' && editor.drag) cancelGesture();
	}}
/>

{#if days.length === 0}
	<div class="bg-base-200 flex flex-col items-center justify-center rounded-box p-12">
		<i class="fas fa-calendar-days text-5xl opacity-50"></i>
		<p class="mt-4 text-lg opacity-70">{m.calendarNoDays()}</p>
		<button class="btn btn-primary mt-4" onclick={onOpenDays}>
			<i class="fas fa-plus"></i>
			{m.calendarAddDay()}
		</button>
	</div>
{:else}
	<div class="flex flex-wrap items-center justify-between gap-2">
		<p class="text-base-content/60 text-sm">
			<i class="fas fa-hand-pointer"></i>
			{m.calendarEditorHint()}
		</p>
		<div class="flex items-center gap-2">
			<label class="label cursor-pointer gap-2 text-sm">
				<input type="checkbox" class="toggle toggle-sm" bind:checked={editor.wholeDay} />
				{m.calendarWholeDay()}
			</label>
		</div>
	</div>

	<div class="overflow-x-auto">
		<div style="min-width: calc(3.5rem + {grid.totalUnits} * 9rem);">
			<!-- Day and track headers -->
			<div class="flex">
				<div class="w-14 shrink-0"></div>
				<div class="relative h-16 grow">
					{#each grid.days as block (block.dayId)}
						{@const day = editorDays.find((d) => d.id === block.dayId)}
						{#if day}
							<div
								class="absolute top-0 flex h-full flex-col px-px"
								style="left: {percent(block.start)}; width: {percent(block.width)};"
							>
								<div class="px-1 pb-1 text-center">
									<span class="text-sm font-bold">{day.name}</span>
									<span class="text-base-content/60 ml-1 text-xs"
										>{dateFormat.format(day.date)}</span
									>
								</div>
								<div class="flex min-h-0 grow">
									{#each block.columns as column (column.trackId ?? '')}
										{@const track = day.tracks.find((t) => t.id === column.trackId)}
										<div
											class="mx-px flex min-w-0 grow basis-0 items-center justify-center rounded-t-field px-1 text-center text-xs font-medium {track
												? 'bg-base-200'
												: ''}"
											title={track?.description ?? track?.name}
										>
											<span class="truncate">{track?.name ?? ''}</span>
										</div>
									{/each}
								</div>
							</div>
						{/if}
					{/each}
				</div>
			</div>

			<div class="flex">
				<!-- Time gutter -->
				<div class="relative w-14 shrink-0" style="height: {gridHeight}px;">
					{#each hours as hour (hour)}
						<div
							class="text-base-content/40 absolute right-2 text-xs leading-none"
							style="top: {(hour - editor.range.startHour) *
								HOUR_HEIGHT}px; transform: translateY(-50%);"
						>
							{formatClockMinutes(hour * 60)}
						</div>
					{/each}
				</div>

				<!-- The grid: empty space creates, cards move and resize -->
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div
					bind:this={layer}
					class="bg-base-200/40 relative grow touch-pan-y select-none {editor.drag?.kind ===
						'entry' && editor.drag.active
						? 'cursor-grabbing'
						: 'cursor-cell'}"
					style="height: {gridHeight}px;"
					onpointerdown={onPointerDown}
					onpointermove={onPointerMove}
					onpointerup={onPointerUp}
					onpointercancel={cancelGesture}
					onkeydown={onKeyDown}
				>
					{#each grid.days as block (block.dayId)}
						<div
							class="bg-base-100 border-base-300 absolute top-0 bottom-0 border-x"
							style="left: {percent(block.start)}; width: {percent(block.width)};"
						>
							{#each block.columns.slice(1) as column (column.trackId ?? '')}
								<div
									class="border-base-300 absolute top-0 bottom-0 border-l border-dashed"
									style="left: {((column.start - block.start) / block.width) * 100}%;"
								></div>
							{/each}
						</div>
					{/each}

					{#each hours as hour (hour)}
						<div
							class="border-base-300 pointer-events-none absolute right-0 left-0 border-t"
							style="top: {(hour - editor.range.startHour) * HOUR_HEIGHT}px;"
						></div>
						<div
							class="border-base-300/40 pointer-events-none absolute right-0 left-0 border-t border-dashed"
							style="top: {(hour - editor.range.startHour) * HOUR_HEIGHT + HOUR_HEIGHT / 2}px;"
						></div>
					{/each}

					{#if editor.creating}
						<div
							class="bg-primary/20 border-primary pointer-events-none absolute z-20 rounded-field border-2 border-dashed px-2 py-0.5 text-xs font-medium"
							style={creatingStyle(editor.creating)}
						>
							{formatClockMinutes(editor.creating.span.start)} – {formatClockMinutes(
								editor.creating.span.end
							)}
						</div>
					{/if}

					{#each editor.entries as entry (entry.id)}
						<EditorEntryCard
							id={entry.id}
							name={entry.name}
							fontAwesomeIcon={entry.fontAwesomeIcon}
							color={entry.color}
							start={entry.start}
							end={entry.end}
							location={[entry.placeName, entry.room].filter(Boolean).join(' · ')}
							overlapping={editor.overlapping.has(entry.id)}
							dragging={editor.drag?.kind === 'entry' &&
								editor.drag.active &&
								editor.drag.entryId === entry.id}
							style={entryStyle(entry)}
						/>
					{/each}
				</div>
			</div>
		</div>
	</div>
{/if}

{#if entryModal}
	{#key entryModal}
		<EntryFormModal
			{conferenceId}
			entryId={entryModal.entryId}
			duplicate={entryModal.duplicate}
			initial={entryModal.initial}
			onClose={() => (entryModal = null)}
			onDuplicate={(entryId) => (entryModal = { entryId, duplicate: true })}
			onDelete={(entryId) => {
				entryModal = null;
				entryToDelete = entryId;
			}}
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
