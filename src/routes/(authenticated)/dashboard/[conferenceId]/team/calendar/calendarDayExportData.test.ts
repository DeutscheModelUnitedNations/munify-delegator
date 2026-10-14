import { describe, expect, test } from 'vitest';
import { calendarDayExportSchema } from '$lib/schemata/calendarDayExport';
import { toCalendarDayExport, type CalendarDayExportSource } from './calendarDayExportData';

describe('toCalendarDayExport', () => {
	const day: CalendarDayExportSource = {
		tracks: [
			{ id: 't1', name: 'Main', description: 'Plenary', sortOrder: 0 },
			{ id: 't2', name: 'Side', description: null, sortOrder: 1 }
		],
		entries: [
			{
				name: 'Opening',
				description: 'Welcome',
				startTime: new Date('2026-03-12T09:00:00Z'),
				endTime: '2026-03-12T10:30:00.000Z',
				fontAwesomeIcon: 'flag',
				color: 'SESSION',
				room: 'Aula',
				tracks: [{ id: 't1' }, { id: 't2' }],
				place: {
					name: 'Town hall',
					address: 'Main street 1',
					latitude: 54.3,
					longitude: 10.1,
					directions: 'Second floor',
					info: 'Bring ID',
					websiteUrl: 'https://example.org'
				}
			},
			{
				name: 'Lunch',
				startTime: new Date('2026-03-12T12:05:00Z'),
				endTime: new Date('2026-03-12T13:00:00Z'),
				color: 'SOCIAL',
				tracks: [{ id: 'missing' }],
				place: { name: 'Canteen', address: null }
			},
			{
				name: 'Break',
				description: null,
				startTime: new Date('2026-03-12T15:00:00Z'),
				endTime: new Date('2026-03-12T15:15:00Z'),
				fontAwesomeIcon: null,
				color: 'LOGISTICS',
				room: null,
				tracks: [],
				place: null
			}
		]
	};

	test('drops ids and keeps track order data', () => {
		const result = toCalendarDayExport(day);
		expect(result.version).toBe(1);
		expect(result.tracks).toEqual([
			{ name: 'Main', description: 'Plenary', sortOrder: 0 },
			{ name: 'Side', description: null, sortOrder: 1 }
		]);
	});

	test('names the track, converts times and copies the place', () => {
		const [opening] = toCalendarDayExport(day).entries;
		expect(opening).toEqual({
			name: 'Opening',
			description: 'Welcome',
			startTime: '09:00',
			endTime: '10:30',
			fontAwesomeIcon: 'flag',
			color: 'SESSION',
			room: 'Aula',
			trackNames: ['Main', 'Side'],
			place: {
				name: 'Town hall',
				address: 'Main street 1',
				latitude: 54.3,
				longitude: 10.1,
				directions: 'Second floor',
				info: 'Bring ID',
				websiteUrl: 'https://example.org'
			}
		});
	});

	test('fills missing fields with null, also for an unknown track', () => {
		const [, lunch, pause] = toCalendarDayExport(day).entries;
		expect(lunch).toMatchObject({
			description: null,
			fontAwesomeIcon: null,
			room: null,
			trackNames: [],
			startTime: '12:05',
			place: {
				name: 'Canteen',
				address: null,
				latitude: null,
				longitude: null,
				directions: null,
				info: null,
				websiteUrl: null
			}
		});
		expect(pause.trackNames).toEqual([]);
		expect(pause.place).toBeNull();
	});

	test('files from before tracks could be spanned still import', () => {
		const old = { version: 1, tracks: [], entries: [] };
		const entry = { ...toCalendarDayExport(day).entries[2], trackName: 'Side' };
		const { trackNames: _, ...legacy } = entry;
		const parsed = calendarDayExportSchema.parse({ ...old, entries: [legacy] });
		expect(parsed.entries[0].trackNames).toEqual(['Side']);
	});

	test('produces a file the import schema accepts', () => {
		expect(calendarDayExportSchema.safeParse(toCalendarDayExport(day)).success).toBe(true);
	});
});
