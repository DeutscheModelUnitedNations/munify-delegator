import { formatClockMinutes } from '$lib/helpers/formatClock';
import { SvelteMap } from 'svelte/reactivity';
import { toast } from 'svelte-sonner';
import { client, type CalendarentrycolorEnum } from '$lib/api/rumbleClient/client';
import { m } from '$lib/paraglide/messages';
import {
	assignLanes,
	buildGrid,
	createSpan,
	dateAtMinutes,
	dragSpan,
	dropPlacement,
	editorHourRange,
	clampedIndex,
	stretchTracks,
	tracksOfRange,
	formatMinutes,
	minutesOfDay,
	normalizeTrackIds,
	nudgeTracks,
	overlappingIds,
	SNAP_MINUTES,
	type DragMode,
	type Placed,
	type Span
} from './calendarGrid';

export interface EditorDay {
	id: string;
	name: string;
	date: Date;
	tracks: { id: string; name: string; description: string | null; sortOrder: number }[];
	entries: EditorDayEntry[];
}

interface EditorDayEntry {
	id: string;
	name: string;
	startTime: Date;
	endTime: Date;
	fontAwesomeIcon: string | null;
	color: CalendarentrycolorEnum;
	room: string | null;
	tracks: { id: string }[];
	place: { name: string } | null;
}

/** An entry as the editor draws it: its stored data, placed in the grid. */
interface EditorEntry extends Placed {
	name: string;
	fontAwesomeIcon: string | null;
	color: CalendarentrycolorEnum;
	room: string | null;
	placeName: string | null;
}

interface Placement extends Span {
	dayId: string;
	/** The tracks the entry runs on */
	trackIds: string[];
}

/** A pointer position, in the editor's units: minutes of the day and columns from the left. */
export interface PointerPosition {
	minutes: number;
	unit: number;
}

interface EntryDrag {
	kind: 'entry';
	entryId: string;
	mode: DragMode;
	origin: Placement;
	grabbed: PointerPosition;
	/** Whether the pointer has travelled far enough to be a drag rather than a click */
	active: boolean;
	target: Placement;
}

interface CreateDrag {
	kind: 'create';
	dayId: string;
	/** Where the press began, in minutes and as a column of the day */
	anchor: number;
	anchorColumn: number;
	/** Where the pointer is now */
	current: number;
	currentColumn: number;
	active: boolean;
}

/** What a finished pointer gesture asks the page to do. */
export type DragOutcome =
	| { type: 'none' }
	| { type: 'click'; entryId: string }
	| { type: 'create'; dayId: string; trackIds: string[]; span: Span };

const samePlacement = (a: Placement, b: Placement) =>
	a.dayId === b.dayId &&
	a.start === b.start &&
	a.end === b.end &&
	a.trackIds.length === b.trackIds.length &&
	a.trackIds.every((id, i) => id === b.trackIds[i]);

/** How far (px) the pointer has to move before a press is a drag rather than a click. */
const DRAG_THRESHOLD = 4;

/** Pending changes older than this are dropped even if the server never showed them. */
const PENDING_TIMEOUT_MS = 5000;

const orNull = <T>(value: T | null | undefined) => value ?? null;

/** What the editor works over, copied out of a live calendar day. */
export function toEditorDay(day: {
	id: string;
	name: string;
	date: Date | string;
	tracks: { id: string; name: string; description?: string | null; sortOrder: number }[];
	entries: {
		id: string;
		name: string;
		startTime: Date | string;
		endTime: Date | string;
		fontAwesomeIcon?: string | null;
		color: CalendarentrycolorEnum;
		room?: string | null;
		tracks: { id: string }[];
		place?: { name: string } | null;
	}[];
}): EditorDay {
	return {
		id: day.id,
		name: day.name,
		date: new Date(day.date),
		tracks: day.tracks
			.map((track) => ({ ...track, description: orNull(track.description) }))
			.sort((a, b) => a.sortOrder - b.sortOrder),
		entries: day.entries.map((entry) => ({
			id: entry.id,
			name: entry.name,
			startTime: new Date(entry.startTime),
			endTime: new Date(entry.endTime),
			fontAwesomeIcon: orNull(entry.fontAwesomeIcon),
			color: entry.color,
			room: orNull(entry.room),
			tracks: entry.tracks.map((track) => ({ id: track.id })),
			place: entry.place ? { name: entry.place.name } : null
		}))
	};
}

function toEditorEntry(day: EditorDay, entry: EditorDayEntry): EditorEntry {
	const start = minutesOfDay(entry.startTime);
	return {
		id: entry.id,
		dayId: day.id,
		trackIds: normalizeTrackIds(
			day.tracks.map((track) => track.id),
			entry.tracks.map((track) => track.id)
		),
		start,
		end: Math.max(minutesOfDay(entry.endTime), start),
		name: entry.name,
		fontAwesomeIcon: entry.fontAwesomeIcon,
		color: entry.color,
		room: entry.room,
		placeName: entry.place?.name ?? null
	};
}

function showError(error: unknown) {
	toast.error(error instanceof Error ? error.message : m.genericToastError());
}

/**
 * The state behind the calendar editor: the entries laid out in a grid, the drag in progress and
 * the saves in flight. Like the seat planner, a change shows at once and is overlaid on the live
 * data until the server has answered; a failure drops it again and says why.
 */
export class CalendarEditor {
	// Set by the constructor, before any derived below is first read
	#days: () => EditorDay[] = () => [];
	#pending = new SvelteMap<string, { placement: Placement; settled: boolean }>();
	#requests: Record<string, number> = {};

	/** The pointer gesture in progress, if any */
	drag = $state<EntryDrag | CreateDrag | null>(null);
	/** Show 00:00 to 24:00 instead of the hours around the entries */
	wholeDay = $state(false);

	constructor(days: () => EditorDay[]) {
		this.#days = days;
	}

	#base = $derived(this.#days().flatMap((day) => day.entries.map((e) => toEditorEntry(day, e))));

	/** The entries with saves in flight applied */
	#committed = $derived(
		this.#base.map((entry) => {
			const pending = this.#pending.get(entry.id);
			return pending ? { ...entry, ...pending.placement } : entry;
		})
	);

	/** The entries as drawn: also with the drag in progress applied */
	entries = $derived.by(() => {
		const drag = this.drag;
		if (drag?.kind !== 'entry' || !drag.active) return this.#committed;
		return this.#committed.map((entry) =>
			entry.id === drag.entryId ? { ...entry, ...drag.target } : entry
		);
	});

	/** The columns of all days */
	grid = $derived(buildGrid(this.#days()));

	/** The hours shown; it follows the saved entries, so it does not shift under a drag */
	range = $derived(editorHourRange(this.#committed, this.wholeDay));

	overlapping = $derived(overlappingIds(this.entries));

	/** The side-by-side lanes of overlapping entries; the dragged one keeps the full width */
	#lanes = $derived.by(() => {
		const dragged = this.drag?.kind === 'entry' && this.drag.active ? this.drag.entryId : null;
		return assignLanes(this.entries.filter((entry) => entry.id !== dragged));
	});

	laneOf(entryId: string) {
		return this.#lanes.get(entryId) ?? { lane: 0, lanes: 1 };
	}

	/** The range being selected on an empty slot */
	creating = $derived.by(() => {
		const drag = this.drag;
		if (drag?.kind !== 'create' || !drag.active) return undefined;
		return {
			dayId: drag.dayId,
			trackIds: this.#createdTracks(drag),
			span: createSpan(drag.anchor, drag.current, true)
		};
	});

	/** The tracks a create drag has swept across, sideways */
	#createdTracks(drag: CreateDrag) {
		const block = this.grid.days.find((d) => d.dayId === drag.dayId);
		if (!block) return [];
		const range = drag.active
			? {
					first: Math.min(drag.anchorColumn, drag.currentColumn),
					last: Math.max(drag.anchorColumn, drag.currentColumn)
				}
			: { first: drag.anchorColumn, last: drag.anchorColumn };
		return tracksOfRange(block, range);
	}

	// === Pointer gestures ===

	beginEntryDrag(entryId: string, mode: DragMode, pointer: PointerPosition) {
		const entry = this.#committed.find((e) => e.id === entryId);
		if (!entry) return;
		const origin = {
			dayId: entry.dayId,
			trackIds: entry.trackIds,
			start: entry.start,
			end: entry.end
		};
		this.drag = {
			kind: 'entry',
			entryId,
			mode,
			origin,
			grabbed: pointer,
			active: false,
			target: origin
		};
	}

	beginCreate(dayId: string, column: number, minutes: number) {
		this.drag = {
			kind: 'create',
			dayId,
			anchor: minutes,
			anchorColumn: column,
			current: minutes,
			currentColumn: column,
			active: false
		};
	}

	/** `travelled` is how far the pointer has moved since the press, in pixels */
	moveDrag(pointer: PointerPosition, travelled: number) {
		const drag = this.drag;
		if (!drag) return;
		if (travelled >= DRAG_THRESHOLD) drag.active = true;
		if (!drag.active) return;
		if (drag.kind === 'create') {
			drag.current = pointer.minutes;
			const block = this.grid.days.find((d) => d.dayId === drag.dayId);
			if (block) drag.currentColumn = clampedIndex(block, pointer.unit);
		} else drag.target = this.#targetOf(drag, pointer);
	}

	/** Where a dragged entry lands with the pointer at `pointer` */
	#targetOf(drag: EntryDrag, pointer: PointerPosition): Placement {
		const span = dragSpan(drag.origin, drag.mode, pointer.minutes - drag.grabbed.minutes);
		if (drag.mode === 'resize-left' || drag.mode === 'resize-right') {
			const trackIds = stretchTracks(this.grid, drag.origin, drag.mode, pointer.unit);
			return { ...drag.origin, trackIds };
		}
		if (drag.mode !== 'move') return { ...drag.origin, ...span };
		const placement = dropPlacement(this.grid, pointer.unit, {
			dayId: drag.origin.dayId,
			trackIds: drag.origin.trackIds,
			unit: drag.grabbed.unit
		});
		return { ...(placement ?? drag.origin), ...span };
	}

	cancelDrag() {
		this.drag = null;
	}

	/** Ends the gesture: saves a moved or resized entry, and says what else the page should do. */
	finishDrag(): DragOutcome {
		const drag = this.drag;
		this.drag = null;
		if (!drag) return { type: 'none' };
		if (drag.kind === 'create') {
			// A click without a drag selects an hour from the slot; a drag the range it covered
			const span = createSpan(drag.anchor, drag.current, drag.active);
			return { type: 'create', dayId: drag.dayId, trackIds: this.#createdTracks(drag), span };
		}
		if (!drag.active) return { type: 'click', entryId: drag.entryId };
		if (!samePlacement(drag.origin, drag.target)) void this.place(drag.entryId, drag.target);
		return { type: 'none' };
	}

	// === Saving ===

	/** Moves an entry to a day, track and time; offers to undo it. */
	async place(entryId: string, placement: Placement, undoable = true) {
		const entry = this.#committed.find((e) => e.id === entryId);
		const day = this.#days().find((d) => d.id === placement.dayId);
		if (!entry || !day) return;
		if (placement.trackIds.length === 0) {
			showError(new Error(m.calendarDayNeedsTrack()));
			return;
		}
		const before: Placement = {
			dayId: entry.dayId,
			trackIds: entry.trackIds,
			start: entry.start,
			end: entry.end
		};

		const request = this.#begin(entryId, placement);
		try {
			await client.mutate.updateCalendarEntry({
				__args: {
					id: entryId,
					calendarDayId: placement.dayId,
					calendarTrackIds: placement.trackIds,
					startTime: dateAtMinutes(day.date, placement.start),
					endTime: dateAtMinutes(day.date, placement.end)
				},
				id: true
			});
		} catch (error) {
			if (this.#requests[entryId] === request) this.#pending.delete(entryId);
			showError(error);
			return;
		}

		this.#answered(entryId, request);
		if (undoable) {
			const message = m.calendarEntryPlaced({
				name: entry.name,
				day: day.name,
				start: formatClockMinutes(placement.start),
				end: formatClockMinutes(placement.end)
			});
			toast.success(message, {
				action: { label: m.undo(), onClick: () => this.place(entryId, before, false) }
			});
		}
	}

	/** Shows a change at once; returns the id of this request, so a later one is not undone by it. */
	#begin(entryId: string, placement: Placement) {
		const request = (this.#requests[entryId] ?? 0) + 1;
		this.#requests[entryId] = request;
		this.#pending.set(entryId, { placement, settled: false });
		return request;
	}

	/** Marks a change as saved; the overlay goes once the live data shows it (see `settle`). */
	#answered(entryId: string, request: number) {
		if (this.#requests[entryId] !== request) return;
		const pending = this.#pending.get(entryId);
		if (pending) pending.settled = true;
		this.settle();
		// The fallback for an answer that never matches what was asked for
		setTimeout(() => {
			if (this.#requests[entryId] === request) this.#pending.delete(entryId);
		}, PENDING_TIMEOUT_MS);
	}

	/**
	 * Moves an entry (or with `resize` its end, or on the tracks axis its right edge) by a quarter
	 * hour or a track, for the keyboard.
	 */
	nudge(entryId: string, mode: 'move' | 'resize', axis: 'time' | 'tracks', direction: 1 | -1) {
		const entry = this.#committed.find((e) => e.id === entryId);
		if (!entry) return;
		const next: Placement = {
			dayId: entry.dayId,
			trackIds: entry.trackIds,
			start: entry.start,
			end: entry.end
		};
		if (axis === 'time') {
			Object.assign(
				next,
				dragSpan(entry, mode === 'move' ? 'move' : 'resize-end', direction * SNAP_MINUTES)
			);
		} else {
			next.trackIds = nudgeTracks(
				this.grid,
				entry,
				mode === 'move' ? 'move' : 'resize-right',
				direction
			);
		}
		if (samePlacement(entry, next)) return;
		void this.place(entryId, next, false);
	}

	/** Drops saved changes the live data now shows. Call it where the live data is read. */
	settle() {
		for (const [entryId, pending] of this.#pending) {
			const entry = this.#base.find((e) => e.id === entryId);
			if (pending.settled && entry && samePlacement(entry, pending.placement)) {
				this.#pending.delete(entryId);
			}
		}
	}
}
