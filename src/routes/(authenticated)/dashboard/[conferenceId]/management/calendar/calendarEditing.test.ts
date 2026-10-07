import { describe, expect, test } from 'vitest';
import {
	findOverlappingEntryIds,
	moveTargetDay,
	sortEntriesByTimeAndTrack,
	trackFields
} from './calendarEditing';

const at = (time: string) => new Date(`2026-03-12T${time}:00Z`);

describe('sortEntriesByTimeAndTrack', () => {
	const tracks = [
		{ id: 'main', sortOrder: 0 },
		{ id: 'side', sortOrder: 1 }
	];

	test('sorts by start time, then by track order with trackless entries first', () => {
		const entries = [
			{ id: 'late', startTime: at('12:00'), endTime: at('13:00'), calendarTrackId: 'main' },
			{ id: 'side', startTime: at('09:00'), endTime: at('10:00'), calendarTrackId: 'side' },
			{ id: 'main', startTime: at('09:00'), endTime: at('10:00'), calendarTrackId: 'main' },
			{ id: 'none', startTime: at('09:00'), endTime: at('10:00'), calendarTrackId: null },
			{ id: 'gone', startTime: '2026-03-12T08:00:00Z', endTime: at('10:00'), calendarTrackId: 'x' }
		];
		expect(sortEntriesByTimeAndTrack(entries, tracks).map((e) => e.id)).toEqual([
			'gone',
			'none',
			'main',
			'side',
			'late'
		]);
		expect(entries[0].id).toBe('late');
	});
});

describe('findOverlappingEntryIds', () => {
	test('flags overlapping entries of the same track only', () => {
		const ids = findOverlappingEntryIds([
			{ id: 'a', startTime: at('09:00'), endTime: at('10:00'), calendarTrackId: 'main' },
			{ id: 'b', startTime: at('09:30'), endTime: at('11:00'), calendarTrackId: 'main' },
			{ id: 'c', startTime: at('09:30'), endTime: at('11:00'), calendarTrackId: 'side' },
			{ id: 'd', startTime: at('11:00'), endTime: at('12:00'), calendarTrackId: 'main' },
			{ id: 'e', startTime: at('09:00'), endTime: at('09:15'), calendarTrackId: null },
			{ id: 'f', startTime: at('09:10'), endTime: at('09:20'), calendarTrackId: null }
		]);
		expect([...ids].sort()).toEqual(['a', 'b', 'e', 'f']);
	});

	test('touching entries do not overlap', () => {
		expect(
			findOverlappingEntryIds([
				{ id: 'a', startTime: at('09:00'), endTime: at('10:00') },
				{ id: 'b', startTime: at('10:00'), endTime: at('11:00') }
			]).size
		).toBe(0);
	});
});

describe('moveTargetDay', () => {
	const days = [{ id: 'd1' }, { id: 'd2' }];

	test('finds the picked day', () => {
		expect(moveTargetDay(days, 'd2', 'd1')).toEqual({ id: 'd2' });
	});

	test('is undefined without a pick, for the current day or an unknown day', () => {
		expect(moveTargetDay(days, null, 'd1')).toBeUndefined();
		expect(moveTargetDay(days, '', 'd1')).toBeUndefined();
		expect(moveTargetDay(days, 'd1', 'd1')).toBeUndefined();
		expect(moveTargetDay(days, 'd3', 'd1')).toBeUndefined();
	});
});

describe('trackFields', () => {
	test('stores an empty description as none', () => {
		expect(trackFields('Main', '', 2)).toEqual({ name: 'Main', description: null, sortOrder: 2 });
		expect(trackFields('Main', 'Plenary', 0)).toEqual({
			name: 'Main',
			description: 'Plenary',
			sortOrder: 0
		});
	});
});
