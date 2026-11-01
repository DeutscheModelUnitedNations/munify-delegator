import { afterEach, describe, expect, test, vi } from 'vitest';
import type { CalendarDayExportData } from '#lib/schemata/calendarDayExport';

const mocks = vi.hoisted(() => ({
	query: {
		calendarTracks: vi.fn(async () => [{ id: 'track-main', name: 'Main' }]),
		places: vi.fn(async () => [{ id: 'place-hall', name: 'Hall' }])
	},
	mutate: {
		createCalendarDay: vi.fn(async () => ({ id: 'day-1' })),
		deleteCalendarDay: vi.fn(async () => true),
		setCalendarTrackOnDay: vi.fn(async () => true),
		createCalendarTrack: vi.fn(async () => ({ id: 'track-new' })),
		createPlace: vi.fn(async () => ({ id: 'place-new' })),
		createCalendarEntry: vi.fn(async (_call: { __args: Record<string, unknown> }) => ({
			id: 'entry'
		}))
	}
}));

vi.mock('#lib/api/rumbleClient/client', () => ({ client: mocks }));

import {
	distinctPlaces,
	importCalendarDay,
	importedEntryArgs,
	parseDayImport
} from './importCalendarDay';

afterEach(() => vi.clearAllMocks());

const place = (name: string, address: string | null = null) => ({
	name,
	address,
	latitude: null,
	longitude: null,
	directions: null,
	info: null,
	websiteUrl: null
});

const entry = (
	overrides: Partial<CalendarDayExportData['entries'][number]> = {}
): CalendarDayExportData['entries'][number] => ({
	name: 'Opening',
	description: null,
	startTime: '09:30',
	endTime: '10:15',
	fontAwesomeIcon: null,
	color: 'SESSION',
	room: null,
	trackNames: [],
	place: null,
	...overrides
});

const date = new Date('2026-03-14T00:00:00.000Z');

describe('parseDayImport', () => {
	test('is no choice without text', () => {
		expect(parseDayImport(null)).toEqual({ data: null, invalid: false });
	});

	test('flags text that is not JSON', () => {
		expect(parseDayImport('nope')).toEqual({ data: null, invalid: true });
	});

	test('flags JSON that is no export', () => {
		expect(parseDayImport('{"a":1}')).toEqual({ data: null, invalid: true });
	});
});

describe('distinctPlaces', () => {
	test('names each place once, as the first entry describes it', () => {
		const places = distinctPlaces([
			entry({ place: place('Hall', 'first') }),
			entry({ place: null }),
			entry({ place: place('Hall', 'second') }),
			entry({ place: place('Garden') })
		]);
		expect(places.map((p) => [p.name, p.address])).toEqual([
			['Hall', 'first'],
			['Garden', null]
		]);
	});
});

describe('importedEntryArgs', () => {
	const trackIdByName = new Map([
		['Main', 't1'],
		['Side', 't2']
	]);
	const placeIdByName = new Map([['Hall', 'p1']]);
	const day = { id: 'day-1', date };

	test('anchors the times to the day in UTC and names the place by id', () => {
		const args = importedEntryArgs({
			entry: entry({ trackNames: ['Side'], place: place('Hall') }),
			day,
			trackIdByName,
			placeIdByName
		});
		expect(args).toMatchObject({
			calendarDayId: 'day-1',
			startTime: new Date('2026-03-14T09:30:00.000Z'),
			endTime: new Date('2026-03-14T10:15:00.000Z'),
			placeId: 'p1',
			calendarTrackIds: ['t2']
		});
	});

	test('runs an entry naming no tracks on all of them', () => {
		const args = importedEntryArgs({ entry: entry(), day, trackIdByName, placeIdByName });
		expect(args.calendarTrackIds).toEqual(['t1', 't2']);
		expect(args.placeId).toBeNull();
	});

	test('leaves out track names the file does not declare', () => {
		const args = importedEntryArgs({
			entry: entry({ trackNames: ['Main', 'Unknown'] }),
			day,
			trackIdByName,
			placeIdByName
		});
		expect(args.calendarTrackIds).toEqual(['t1']);
	});
});

describe('importCalendarDay', () => {
	const data: CalendarDayExportData = {
		version: 1,
		tracks: [
			{ name: 'Main', description: null, sortOrder: 0 },
			{ name: 'Side', description: 'B', sortOrder: 1 }
		],
		entries: [
			entry({ name: 'A', place: place('Hall') }),
			entry({ name: 'B', place: place('Garden'), trackNames: ['Side'] })
		]
	};

	test('reuses tracks and places by name and creates the rest', async () => {
		await importCalendarDay({ conferenceId: 'c1', name: 'Day 1', date, data });

		expect(mocks.mutate.createCalendarDay).toHaveBeenCalledWith(
			expect.objectContaining({ __args: { conferenceId: 'c1', name: 'Day 1', date } })
		);
		expect(mocks.mutate.setCalendarTrackOnDay).toHaveBeenCalledWith(
			expect.objectContaining({
				__args: { id: 'track-main', calendarDayId: 'day-1', runs: true }
			})
		);
		expect(mocks.mutate.createCalendarTrack).toHaveBeenCalledOnce();
		expect(mocks.mutate.createCalendarTrack).toHaveBeenCalledWith(
			expect.objectContaining({
				__args: expect.objectContaining({ name: 'Side', calendarDayIds: ['day-1'] })
			})
		);
		expect(mocks.mutate.createPlace).toHaveBeenCalledOnce();
		expect(mocks.mutate.createPlace).toHaveBeenCalledWith(
			expect.objectContaining({ __args: expect.objectContaining({ name: 'Garden' }) })
		);
		expect(mocks.mutate.createCalendarEntry.mock.calls.map(([call]) => call.__args)).toEqual([
			expect.objectContaining({
				name: 'A',
				placeId: 'place-hall',
				calendarTrackIds: ['track-main', 'track-new']
			}),
			expect.objectContaining({
				name: 'B',
				placeId: 'place-new',
				calendarTrackIds: ['track-new']
			})
		]);
		expect(mocks.mutate.deleteCalendarDay).not.toHaveBeenCalled();
	});

	test('asks for no places when no entry names one', async () => {
		await importCalendarDay({
			conferenceId: 'c1',
			name: 'Day 1',
			date,
			data: { ...data, entries: [entry()] }
		});
		expect(mocks.query.places).not.toHaveBeenCalled();
	});

	test('deletes the day again when a step fails', async () => {
		mocks.mutate.createCalendarEntry.mockRejectedValueOnce(new Error('boom'));

		await expect(
			importCalendarDay({ conferenceId: 'c1', name: 'Day 1', date, data })
		).rejects.toThrow('boom');
		expect(mocks.mutate.deleteCalendarDay).toHaveBeenCalledWith({ __args: { id: 'day-1' } });
	});
});
