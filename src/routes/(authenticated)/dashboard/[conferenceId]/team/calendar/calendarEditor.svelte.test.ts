import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { EditorDay } from './calendarEditor.svelte';

const updateCalendarEntry = vi.fn();
vi.mock('$lib/api/rumbleClient/client', () => ({
	client: { mutate: { updateCalendarEntry: (args: unknown) => updateCalendarEntry(args) } }
}));
const toastError = vi.fn();
const toastSuccess = vi.fn();
vi.mock('svelte-sonner', () => ({
	toast: {
		error: (message: string) => toastError(message),
		success: (message: string, options: unknown) => toastSuccess(message, options)
	}
}));

const { CalendarEditor } = await import('./calendarEditor.svelte');

const at = (day: string, time: string) => new Date(`${day}T${time}:00Z`);

function days(entryTrackIds: string[] = ['a'], start = '09:00', end = '10:00'): EditorDay[] {
	const entry = (id: string, name: string, trackIds: string[]) => ({
		id,
		name,
		startTime: at('2026-03-12', start),
		endTime: at('2026-03-12', end),
		fontAwesomeIcon: null,
		color: 'SESSION' as const,
		room: null,
		tracks: trackIds.map((trackId) => ({ id: trackId })),
		place: null
	});
	return [
		{
			id: 'd1',
			name: 'Day 1',
			date: at('2026-03-12', '00:00'),
			tracks: [
				{ id: 'a', name: 'A', description: null, sortOrder: 0 },
				{ id: 'b', name: 'B', description: null, sortOrder: 1 }
			],
			entries: [entry('e1', 'Plenum', entryTrackIds)]
		},
		{
			id: 'd2',
			name: 'Day 2',
			date: at('2026-03-13', '00:00'),
			tracks: [{ id: 'x', name: 'X', description: null, sortOrder: 0 }],
			entries: []
		}
	];
}

let source = $state<EditorDay[]>(days());
const setup = () => new CalendarEditor(() => source);

beforeEach(() => {
	updateCalendarEntry.mockReset().mockResolvedValue({ id: 'e1' });
	toastError.mockReset();
	toastSuccess.mockReset();
	source = days();
});

// Vitest runs Svelte's server build, where a `$derived` is computed once. So each test reads the
// derived state after its last change, and the live overlay of a save is left to the e2e spec.
describe('CalendarEditor', () => {
	test('lays the entries out in minutes, in the grid of all days', () => {
		const editor = setup();
		expect(editor.entries).toMatchObject([
			{ id: 'e1', dayId: 'd1', trackIds: ['a'], start: 540, end: 600 }
		]);
		expect(editor.grid.days.map((d) => d.dayId)).toEqual(['d1', 'd2']);
		expect(editor.range).toEqual({ startHour: 8, endHour: 18 });
	});

	test('a drag shows the entry where it would land, and saves it on release', () => {
		const editor = setup();
		editor.beginEntryDrag('e1', 'move', { minutes: 550, unit: 0.5 });
		editor.moveDrag({ minutes: 610, unit: 1.5 }, 20);
		expect(editor.entries[0]).toMatchObject({ trackIds: ['b'], start: 600, end: 660 });

		expect(editor.finishDrag()).toEqual({ type: 'none' });
		expect(updateCalendarEntry).toHaveBeenCalledWith({
			__args: {
				id: 'e1',
				calendarDayId: 'd1',
				calendarTrackIds: ['b'],
				startTime: at('2026-03-12', '10:00'),
				endTime: at('2026-03-12', '11:00')
			},
			id: true
		});
	});

	test('a drag onto another day moves the entry there', () => {
		const editor = setup();
		editor.beginEntryDrag('e1', 'move', { minutes: 550, unit: 0.5 });
		editor.moveDrag({ minutes: 550, unit: 2.4 }, 40);
		editor.finishDrag();
		expect(updateCalendarEntry).toHaveBeenCalledWith({
			__args: expect.objectContaining({
				calendarDayId: 'd2',
				calendarTrackIds: ['x'],
				startTime: at('2026-03-13', '09:00')
			}),
			id: true
		});
	});

	test('an entry cannot be placed on no track', async () => {
		const editor = setup();
		await editor.place('e1', { dayId: 'd1', trackIds: [], start: 540, end: 600 });
		expect(updateCalendarEntry).not.toHaveBeenCalled();
	});

	test('resizing moves only the grabbed edge', () => {
		const editor = setup();
		editor.beginEntryDrag('e1', 'resize-end', { minutes: 600, unit: 0.5 });
		editor.moveDrag({ minutes: 630, unit: 0.5 }, 20);
		editor.finishDrag();
		expect(updateCalendarEntry).toHaveBeenCalledWith({
			__args: expect.objectContaining({
				startTime: at('2026-03-12', '09:00'),
				endTime: at('2026-03-12', '10:30')
			}),
			id: true
		});
	});

	test('a press that does not travel is a click and saves nothing', () => {
		const editor = setup();
		editor.beginEntryDrag('e1', 'move', { minutes: 550, unit: 0.5 });
		editor.moveDrag({ minutes: 560, unit: 0.5 }, 2);
		expect(editor.finishDrag()).toEqual({ type: 'click', entryId: 'e1' });
		expect(updateCalendarEntry).not.toHaveBeenCalled();
	});

	test('a drag back to where it started saves nothing, and so does cancelling', () => {
		const editor = setup();
		editor.beginEntryDrag('e1', 'move', { minutes: 550, unit: 0.5 });
		editor.moveDrag({ minutes: 551, unit: 0.5 }, 20);
		expect(editor.finishDrag()).toEqual({ type: 'none' });

		editor.beginEntryDrag('e1', 'move', { minutes: 550, unit: 0.5 });
		editor.moveDrag({ minutes: 700, unit: 0.5 }, 20);
		editor.cancelDrag();
		expect(editor.drag).toBeNull();
		expect(editor.entries[0]).toMatchObject({ start: 540 });
		expect(updateCalendarEntry).not.toHaveBeenCalled();
	});

	test('a drag on an empty slot selects the range to create', () => {
		const editor = setup();
		editor.beginCreate('d1', 1, 700);
		editor.moveDrag({ minutes: 770, unit: 1.5 }, 30);
		expect(editor.creating).toEqual({
			dayId: 'd1',
			trackIds: ['b'],
			span: { start: 690, end: 780 }
		});
		expect(editor.finishDrag()).toEqual({
			type: 'create',
			dayId: 'd1',
			trackIds: ['b'],
			span: { start: 690, end: 780 }
		});

		editor.beginCreate('d1', 0, 700);
		expect(editor.finishDrag()).toMatchObject({ span: { start: 690, end: 750 } });
	});

	test('offers to undo a move', async () => {
		const editor = setup();
		await editor.place('e1', { dayId: 'd1', trackIds: ['b'], start: 600, end: 660 });
		const [, options] = toastSuccess.mock.calls[0];
		await options.action.onClick();
		expect(updateCalendarEntry).toHaveBeenLastCalledWith({
			__args: expect.objectContaining({
				calendarTrackIds: ['a'],
				startTime: at('2026-03-12', '09:00')
			}),
			id: true
		});
		expect(toastSuccess).toHaveBeenCalledTimes(1);
	});

	test('a failed save says why and offers no undo', async () => {
		updateCalendarEntry.mockRejectedValue(new Error('not allowed'));
		const editor = setup();
		await editor.place('e1', { dayId: 'd1', trackIds: ['b'], start: 600, end: 660 });
		expect(toastError).toHaveBeenCalledWith('not allowed');
		expect(toastSuccess).not.toHaveBeenCalled();
	});

	test('the keyboard nudges by a quarter hour, stopping at the limits', () => {
		const editor = setup();
		editor.nudge('e1', 'move', 'time', 1);
		expect(updateCalendarEntry).toHaveBeenLastCalledWith({
			__args: expect.objectContaining({ startTime: at('2026-03-12', '09:15') }),
			id: true
		});
		editor.nudge('e1', 'resize', 'time', -1);
		expect(updateCalendarEntry).toHaveBeenLastCalledWith({
			__args: expect.objectContaining({ endTime: at('2026-03-12', '09:45') }),
			id: true
		});
	});

	test('dragging a side edge stretches the entry over more tracks', () => {
		const editor = setup();
		editor.beginEntryDrag('e1', 'resize-right', { minutes: 570, unit: 0.9 });
		editor.moveDrag({ minutes: 570, unit: 1.5 }, 20);
		expect(editor.entries[0]).toMatchObject({ trackIds: ['a', 'b'], start: 540, end: 600 });
		editor.finishDrag();
		expect(updateCalendarEntry).toHaveBeenCalledWith({
			__args: expect.objectContaining({
				calendarTrackIds: ['a', 'b'],
				startTime: at('2026-03-12', '09:00'),
				endTime: at('2026-03-12', '10:00')
			}),
			id: true
		});
	});

	test('dragging across tracks of an empty slot selects them for a new entry', () => {
		const editor = setup();
		editor.beginCreate('d1', 0, 700);
		editor.moveDrag({ minutes: 760, unit: 0.6 }, 30);
		expect(editor.creating).toMatchObject({ trackIds: ['a'] });
		editor.moveDrag({ minutes: 760, unit: 1.6 }, 30);
		expect(editor.creating).toMatchObject({ trackIds: ['a', 'b'] });
	});

	test('the keyboard moves an entry to the next track', () => {
		const editor = setup();
		editor.nudge('e1', 'move', 'tracks', 1);
		expect(updateCalendarEntry).toHaveBeenLastCalledWith({
			__args: expect.objectContaining({ calendarTrackIds: ['b'] }),
			id: true
		});
	});

	test('flags colliding entries and gives them lanes', () => {
		const editor = setup();
		source[0].entries.push({ ...source[0].entries[0], id: 'e2', name: 'Other' });
		expect([...editor.overlapping].sort()).toEqual(['e1', 'e2']);
		expect(editor.laneOf('e1')).toEqual({ lane: 0, lanes: 2 });
		expect(editor.laneOf('e2')).toEqual({ lane: 1, lanes: 2 });
	});
});
