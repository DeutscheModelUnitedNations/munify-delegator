import { describe, expect, test } from 'vitest';
import { copiedEntryArgs, matchingTargetTrackIds, retargetTrackRange } from './copyDayEntries';

// Tracks are the conference's: the target day runs `main`, not `side`.
const targetTracks = [{ id: 'main' }];

describe('matchingTargetTrackIds', () => {
	test('keeps the tracks that run on the target day too', () => {
		expect(matchingTargetTrackIds({ trackIds: ['main'], targetTracks })).toEqual(['main']);
	});

	test('leaves out the tracks the target day does not run', () => {
		expect(matchingTargetTrackIds({ trackIds: [], targetTracks })).toEqual([]);
		expect(matchingTargetTrackIds({ trackIds: ['gone'], targetTracks })).toEqual([]);
		expect(matchingTargetTrackIds({ trackIds: ['side', 'main'], targetTracks })).toEqual(['main']);
	});

	test('does not match a track of the same name, which is another track', () => {
		expect(
			matchingTargetTrackIds({ trackIds: ['main'], targetTracks: [{ id: 'main-copy' }] })
		).toEqual([]);
	});
});

describe('copiedEntryArgs', () => {
	const targetDay = { id: 'day2', date: '2026-03-14T00:00:00.000Z' };
	const tracks = targetTracks;

	test('moves the times to the target day and keeps everything else', () => {
		expect(
			copiedEntryArgs({
				entry: {
					name: 'Opening',
					description: 'Welcome',
					startTime: new Date('2026-03-12T09:00:00Z'),
					endTime: '2026-03-12T10:30:00Z',
					fontAwesomeIcon: 'flag',
					color: 'SESSION',
					placeId: 'p1',
					room: 'Aula',
					surveyOptions: [{ id: 'o1' }, { id: 'o2' }],
					tracks: [{ id: 'main' }]
				},
				targetDay,
				tracks
			})
		).toEqual({
			calendarDayId: 'day2',
			calendarTrackIds: ['main'],
			name: 'Opening',
			description: 'Welcome',
			startTime: new Date('2026-03-14T09:00:00Z'),
			endTime: new Date('2026-03-14T10:30:00Z'),
			fontAwesomeIcon: 'flag',
			color: 'SESSION',
			placeId: 'p1',
			room: 'Aula',
			surveyOptionIds: ['o1', 'o2']
		});
	});

	test('passes missing optional fields as null, and no survey options as everybody', () => {
		expect(
			copiedEntryArgs({
				entry: {
					name: 'Break',
					startTime: '2026-03-12T15:00:00Z',
					endTime: '2026-03-12T15:15:00Z',
					color: 'BREAK',
					tracks: []
				},
				targetDay,
				tracks
			})
		).toMatchObject({
			calendarTrackIds: [],
			description: null,
			fontAwesomeIcon: null,
			placeId: null,
			room: null,
			surveyOptionIds: []
		});
	});
});

describe('retargetTrackRange', () => {
	const target = [{ id: 'other' }, { id: 'workshop' }, { id: 'plenary' }];

	test('keeps both ends where the target day runs them', () => {
		expect(
			retargetTrackRange({ range: { from: 'plenary', to: 'workshop' }, targetTracks: target })
		).toEqual({ from: 'plenary', to: 'workshop' });
	});

	test('a single track keeps both ends together', () => {
		expect(
			retargetTrackRange({ range: { from: 'plenary', to: null }, targetTracks: target })
		).toEqual({ from: 'plenary', to: 'plenary' });
	});

	test('falls back to the first track of the target day', () => {
		expect(retargetTrackRange({ range: { from: 'x', to: null }, targetTracks: target })).toEqual({
			from: 'other',
			to: 'other'
		});
		expect(retargetTrackRange({ range: { from: null, to: null }, targetTracks: [] })).toEqual({
			from: null,
			to: null
		});
	});
});
