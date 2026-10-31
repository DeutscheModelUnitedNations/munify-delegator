import { describe, expect, test } from 'vitest';
import { entriesOnDays, rowOrderChanges, runsOn, type MatrixTrack } from './trackMatrix';

const track = (
	id: string,
	sortOrder: number,
	entries: MatrixTrack['entries'] = []
): MatrixTrack => ({
	id,
	name: id.toUpperCase(),
	description: null,
	sortOrder,
	committees: [],
	conferenceRoles: [],
	entries
});

const day = (id: string, trackIds: string[]) => ({
	id,
	name: id,
	date: new Date('2026-01-01T00:00:00Z'),
	sortOrder: 0,
	entries: [],
	tracks: trackIds.map((trackId) => ({ id: trackId }))
});

describe('runsOn', () => {
	test('is whether the day lists the track by id', () => {
		expect(runsOn({ track: { id: 'a' }, day: day('d1', ['a']) })).toBe(true);
		expect(runsOn({ track: { id: 'b' }, day: day('d1', ['a']) })).toBe(false);
	});
});

describe('entriesOnDays', () => {
	test('collects the entries of the given days only, each once', () => {
		const tracks = [
			track('a', 0, [
				{ id: 'e1', calendarDayId: 'd1' },
				{ id: 'e2', calendarDayId: 'd2' }
			]),
			track('b', 1, [{ id: 'e1', calendarDayId: 'd1' }])
		];
		expect([...entriesOnDays({ tracks, dayIds: ['d1'] })]).toEqual(['e1']);
		expect(entriesOnDays({ tracks, dayIds: [] }).size).toBe(0);
	});
});

describe('rowOrderChanges', () => {
	const tracks = [track('a', 0), track('b', 1), track('c', 2)];

	test('renumbers the tracks that moved', () => {
		expect(rowOrderChanges({ tracks, trackId: 'c', toIndex: 0 })).toEqual([
			{ id: 'c', sortOrder: 0 },
			{ id: 'a', sortOrder: 1 },
			{ id: 'b', sortOrder: 2 }
		]);
	});

	test('changes nothing for an unknown track, a no-op or an out-of-range drop', () => {
		expect(rowOrderChanges({ tracks, trackId: 'x', toIndex: 0 })).toEqual([]);
		expect(rowOrderChanges({ tracks, trackId: 'a', toIndex: 0 })).toEqual([]);
		expect(rowOrderChanges({ tracks, trackId: 'a', toIndex: -1 })).toEqual([]);
		expect(rowOrderChanges({ tracks, trackId: 'a', toIndex: 3 })).toEqual([]);
	});
});
