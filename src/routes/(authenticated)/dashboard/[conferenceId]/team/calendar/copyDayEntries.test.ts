import { describe, expect, test } from 'vitest';
import { copiedEntryArgs, matchingTargetTrackIds, retargetTrackRange } from './copyDayEntries';

const sourceTracks = [
	{ id: 's1', name: 'Main' },
	{ id: 's2', name: 'Side' }
];
const targetTracks = [{ id: 't1', name: 'Main' }];

describe('matchingTargetTrackIds', () => {
	test('finds the target tracks with the same names', () => {
		expect(matchingTargetTrackIds(['s1'], sourceTracks, targetTracks)).toEqual(['t1']);
	});

	test('leaves out unknown tracks and those without a namesake on the target day', () => {
		expect(matchingTargetTrackIds([], sourceTracks, targetTracks)).toEqual([]);
		expect(matchingTargetTrackIds(['gone'], sourceTracks, targetTracks)).toEqual([]);
		expect(matchingTargetTrackIds(['s2', 's1'], sourceTracks, targetTracks)).toEqual(['t1']);
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
					tracks: [{ id: 's1' }]
				},
				targetDay,
				tracks
			)
		).toEqual({
			calendarDayId: 'day2',
			calendarTrackIds: ['t1'],
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
					color: 'BREAK',
					tracks: []
				},
				targetDay,
				tracks
			)
		).toMatchObject({
			calendarTrackIds: [],
			description: null,
			fontAwesomeIcon: null,
			placeId: null,
			room: null
		});
	});
});

describe('retargetTrackRange', () => {
	const source = [
		{ id: 's1', name: 'Plenary' },
		{ id: 's2', name: 'Workshop' }
	];
	const target = [
		{ id: 't0', name: 'Other' },
		{ id: 't2', name: 'Workshop' },
		{ id: 't1', name: 'Plenary' }
	];

	test('maps both ends to the tracks of the same name', () => {
		expect(retargetTrackRange({ from: 's1', to: 's2' }, source, target)).toEqual({
			from: 't1',
			to: 't2'
		});
	});

	test('a single track keeps both ends together', () => {
		expect(retargetTrackRange({ from: 's1', to: null }, source, target)).toEqual({
			from: 't1',
			to: 't1'
		});
	});

	test('falls back to the first track of the target day', () => {
		expect(retargetTrackRange({ from: 'x', to: null }, source, target)).toEqual({
			from: 't0',
			to: 't0'
		});
		expect(retargetTrackRange({ from: null, to: null }, source, [])).toEqual({
			from: null,
			to: null
		});
	});
});
