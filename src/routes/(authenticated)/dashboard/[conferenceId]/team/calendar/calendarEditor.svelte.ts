import { formatClockMinutes } from '#lib/helpers/formatClock.js';
import { SvelteMap } from 'svelte/reactivity';
import { toast } from 'svelte-sonner';
import { client, type CalendarentrycolorEnum } from '#lib/api/rumbleClient/client.js';
import { m } from '#lib/paraglide/messages.js';
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
	/** The survey option whose choosers alone see the entry */
	surveyOption: { title: string } | null;
}

/** An entry as the editor draws it: its stored data, placed in the grid. */
interface EditorEntry extends Placed {
	name: string;
	fontAwesomeIcon: string | null;
	color: CalendarentrycolorEnum;
	room: string | null;
	placeName: string | null;
	surveyOptionTitle: string | null;
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
type DragOutcome =
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
		surveyOption?: { title: string } | null;
	}[];
}): EditorDay {
	return {
		id: day.id,
		name: day.name,
		// eslint-disable-next-line svelte/prefer-svelte-reactivity -- a value copy, never mutated
		date: new Date(day.date),
		tracks: day.tracks
			.map((track) => ({ ...track, description: orNull(track.description) }))
			.sort((a, b) => a.sortOrder - b.sortOrder),
		entries: day.entries.map((entry) => ({
			id: entry.id,
			name: entry.name,
			// eslint-disable-next-line svelte/prefer-svelte-reactivity -- a value copy, never mutated
			startTime: new Date(entry.startTime),
			// eslint-disable-next-line svelte/prefer-svelte-reactivity -- a value copy, never mutated
			endTime: new Date(entry.endTime),
			fontAwesomeIcon: orNull(entry.fontAwesomeIcon),
			color: entry.color,
			room: orNull(entry.room),
			tracks: entry.tracks.map((track) => ({ id: track.id })),
			place: entry.place ? { name: entry.place.name } : null,
			surveyOption: entry.surveyOption ? { title: entry.surveyOption.title } : null
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
		placeName: entry.place?.name ?? null,
		surveyOptionTitle: entry.surveyOption?.title ?? null
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
export function createCalendarEditor(days: () => EditorDay[]) {
	const pending = new SvelteMap<string, { placement: Placement; settled: boolean }>();
	const requests: Record<string, number> = {};

	/** The pointer gesture in progress, if any */
	let drag = $state<EntryDrag | CreateDrag | null>(null);
	/** Show 00:00 to 24:00 instead of the hours around the entries */
	let wholeDay = $state(false);

	const base = $derived(days().flatMap((day) => day.entries.map((e) => toEditorEntry(day, e))));

	/** The entries with saves in flight applied */
	const committed = $derived(
		base.map((entry) => {
			const inFlight = pending.get(entry.id);
			return inFlight ? { ...entry, ...inFlight.placement } : entry;
		})
	);

	/** The entries as drawn: also with the drag in progress applied */
	const entries = $derived.by(() => {
		const current = drag;
		if (current?.kind !== 'entry' || !current.active) return committed;
		return committed.map((entry) =>
			entry.id === current.entryId ? { ...entry, ...current.target } : entry
		);
	});

	/** The columns of all days */
	const grid = $derived(buildGrid(days()));

	/** The hours shown; it follows the saved entries, so it does not shift under a drag */
	const range = $derived(editorHourRange(committed, wholeDay));

	const overlapping = $derived(overlappingIds(entries));

	/** The side-by-side lanes of overlapping entries; the dragged one keeps the full width */
	const lanes = $derived.by(() => {
		const dragged = drag?.kind === 'entry' && drag.active ? drag.entryId : null;
		return assignLanes(entries.filter((entry) => entry.id !== dragged));
	});

	/** The tracks a create drag has swept across, sideways */
	function createdTracks(current: CreateDrag) {
		const block = grid.days.find((d) => d.dayId === current.dayId);
		if (!block) return [];
		const columns = current.active
			? {
					first: Math.min(current.anchorColumn, current.currentColumn),
					last: Math.max(current.anchorColumn, current.currentColumn)
				}
			: { first: current.anchorColumn, last: current.anchorColumn };
		return tracksOfRange(block, columns);
	}

	/** The range being selected on an empty slot */
	const creating = $derived.by(() => {
		const current = drag;
		if (current?.kind !== 'create' || !current.active) return undefined;
		return {
			dayId: current.dayId,
			trackIds: createdTracks(current),
			span: createSpan(current.anchor, current.current, true)
		};
	});

	/** Where a dragged entry lands with the pointer at `pointer` */
	function targetOf(current: EntryDrag, pointer: PointerPosition): Placement {
		const span = dragSpan(current.origin, current.mode, pointer.minutes - current.grabbed.minutes);
		if (current.mode === 'resize-left' || current.mode === 'resize-right') {
			const trackIds = stretchTracks(grid, current.origin, current.mode, pointer.unit);
			return { ...current.origin, trackIds };
		}
		if (current.mode !== 'move') return { ...current.origin, ...span };
		const placement = dropPlacement(grid, pointer.unit, {
			dayId: current.origin.dayId,
			trackIds: current.origin.trackIds,
			unit: current.grabbed.unit
		});
		return { ...(placement ?? current.origin), ...span };
	}

	/** Shows a change at once; returns the id of this request, so a later one is not undone by it. */
	function begin(entryId: string, placement: Placement) {
		const request = (requests[entryId] ?? 0) + 1;
		requests[entryId] = request;
		pending.set(entryId, { placement, settled: false });
		return request;
	}

	/** Marks a change as saved; the overlay goes once the live data shows it (see `settle`). */
	function answered(entryId: string, request: number) {
		if (requests[entryId] !== request) return;
		const inFlight = pending.get(entryId);
		if (inFlight) inFlight.settled = true;
		settle();
		// The fallback for an answer that never matches what was asked for
		setTimeout(() => {
			if (requests[entryId] === request) pending.delete(entryId);
		}, PENDING_TIMEOUT_MS);
	}

	/** Drops saved changes the live data now shows. Call it where the live data is read. */
	function settle() {
		for (const [entryId, inFlight] of pending) {
			const entry = base.find((e) => e.id === entryId);
			if (inFlight.settled && entry && samePlacement(entry, inFlight.placement)) {
				pending.delete(entryId);
			}
		}
	}

	/** Moves an entry to a day, track and time; offers to undo it. */
	async function place(entryId: string, placement: Placement, undoable = true) {
		const entry = committed.find((e) => e.id === entryId);
		const day = days().find((d) => d.id === placement.dayId);
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

		const request = begin(entryId, placement);
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
			if (requests[entryId] === request) pending.delete(entryId);
			showError(error);
			return;
		}

		answered(entryId, request);
		if (undoable) {
			const message = m.calendarEntryPlaced({
				name: entry.name,
				day: day.name,
				start: formatClockMinutes(placement.start),
				end: formatClockMinutes(placement.end)
			});
			toast.success(message, {
				action: { label: m.undo(), onClick: () => place(entryId, before, false) }
			});
		}
	}

	return {
		get drag() {
			return drag;
		},
		set drag(value: EntryDrag | CreateDrag | null) {
			drag = value;
		},
		get wholeDay() {
			return wholeDay;
		},
		set wholeDay(value: boolean) {
			wholeDay = value;
		},
		get entries() {
			return entries;
		},
		get grid() {
			return grid;
		},
		get range() {
			return range;
		},
		get overlapping() {
			return overlapping;
		},
		get creating() {
			return creating;
		},

		laneOf(entryId: string) {
			return lanes.get(entryId) ?? { lane: 0, lanes: 1 };
		},

		// === Pointer gestures ===

		beginEntryDrag(entryId: string, mode: DragMode, pointer: PointerPosition) {
			const entry = committed.find((e) => e.id === entryId);
			if (!entry) return;
			const origin = {
				dayId: entry.dayId,
				trackIds: entry.trackIds,
				start: entry.start,
				end: entry.end
			};
			drag = {
				kind: 'entry',
				entryId,
				mode,
				origin,
				grabbed: pointer,
				active: false,
				target: origin
			};
		},

		beginCreate(dayId: string, column: number, minutes: number) {
			drag = {
				kind: 'create',
				dayId,
				anchor: minutes,
				anchorColumn: column,
				current: minutes,
				currentColumn: column,
				active: false
			};
		},

		/** `travelled` is how far the pointer has moved since the press, in pixels */
		moveDrag(pointer: PointerPosition, travelled: number) {
			const current = drag;
			if (!current) return;
			if (travelled >= DRAG_THRESHOLD) current.active = true;
			if (!current.active) return;
			if (current.kind === 'create') {
				current.current = pointer.minutes;
				const block = grid.days.find((d) => d.dayId === current.dayId);
				if (block) current.currentColumn = clampedIndex(block, pointer.unit);
			} else current.target = targetOf(current, pointer);
		},

		cancelDrag() {
			drag = null;
		},

		/** Ends the gesture: saves a moved or resized entry, and says what else the page should do. */
		finishDrag(): DragOutcome {
			const current = drag;
			drag = null;
			if (!current) return { type: 'none' };
			if (current.kind === 'create') {
				// A click without a drag selects an hour from the slot; a drag the range it covered
				const span = createSpan(current.anchor, current.current, current.active);
				return {
					type: 'create',
					dayId: current.dayId,
					trackIds: createdTracks(current),
					span
				};
			}
			if (!current.active) return { type: 'click', entryId: current.entryId };
			if (!samePlacement(current.origin, current.target))
				void place(current.entryId, current.target);
			return { type: 'none' };
		},

		// === Saving ===

		place,

		/**
		 * Moves an entry (or with `resize` its end, or on the tracks axis its right edge) by a quarter
		 * hour or a track, for the keyboard.
		 */
		nudge(entryId: string, mode: 'move' | 'resize', axis: 'time' | 'tracks', direction: 1 | -1) {
			const entry = committed.find((e) => e.id === entryId);
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
					grid,
					entry,
					mode === 'move' ? 'move' : 'resize-right',
					direction
				);
			}
			if (samePlacement(entry, next)) return;
			void place(entryId, next, false);
		},

		settle
	};
}

type CalendarEditor = ReturnType<typeof createCalendarEditor>;
