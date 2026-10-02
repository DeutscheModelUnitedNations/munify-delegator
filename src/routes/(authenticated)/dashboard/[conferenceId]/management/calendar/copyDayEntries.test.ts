import { describe, expect, test } from 'vitest';
import { copiedEntryArgs, matchingTargetTrackId } from './copyDayEntries';

const sourceTracks = [
	{ id: 's1', name: 'Main' },
	{ id: 's2', name: 'Side' }
];
const targetTracks = [{ id: 't1', name: 'Main' }];

describe('matchingTargetTrackId', () => {
	test('finds the target track with the same name', () => {
		expect(matchingTargetTrackId('s1', sourceTracks, targetTracks)).toBe('t1');
	});

	test('is null without a track, an unknown track or no namesake on the target day', () => {
		expect(matchingTargetTrackId(null, sourceTracks, targetTracks)).toBeNull();
		expect(matchingTargetTrackId(undefined, sourceTracks, targetTracks)).toBeNull();
		expect(matchingTargetTrackId('gone', sourceTracks, targetTracks)).toBeNull();
		expect(matchingTargetTrackId('s2', sourceTracks, targetTracks)).toBeNull();
	});
});

describe('copiedEntryArgs', () => {
	const targetDay = { id: 'day2', date: '2026-03-14T00:00:00.000Z' };
	const tracks = { source: sourceTracks, target: targetTracks };

	test('moves the times to the target day and keeps everything else', () => {
		expect(
			copiedEntryArgs(
				{
					name: 'Opening',
					description: 'Welcome',
					startTime: new Date('2026-03-12T09:00:00Z'),
					endTime: '2026-03-12T10:30:00Z',
					fontAwesomeIcon: 'flag',
					color: 'SESSION',
					placeId: 'p1',
					room: 'Aula',
					calendarTrackId: 's1'
				},
				targetDay,
				tracks
			)
		).toEqual({
			calendarDayId: 'day2',
			calendarTrackId: 't1',
			name: 'Opening',
			description: 'Welcome',
			startTime: new Date('2026-03-14T09:00:00Z'),
			endTime: new Date('2026-03-14T10:30:00Z'),
			fontAwesomeIcon: 'flag',
			color: 'SESSION',
			placeId: 'p1',
			room: 'Aula'
		});
	});

	test('passes missing optional fields as null', () => {
		expect(
			copiedEntryArgs(
				{
					name: 'Break',
					startTime: '2026-03-12T15:00:00Z',
					endTime: '2026-03-12T15:15:00Z',
					color: 'BREAK'
				},
				targetDay,
				tracks
			)
		).toMatchObject({
			calendarTrackId: null,
			description: null,
			fontAwesomeIcon: null,
			placeId: null,
			room: null
		});
	});
});
