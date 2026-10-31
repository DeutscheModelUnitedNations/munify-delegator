import { describe, expect, test } from 'vitest';
import { entryTrackSummary, todayIndex } from './calendarDisplay';

describe('todayIndex', () => {
	const days = [
		{ date: new Date('2026-03-01T00:00:00Z') },
		{ date: new Date('2026-03-02T00:00:00Z') }
	];

	test('finds the day matching today in the timezone', () => {
		expect(todayIndex({ days, timezone: 'UTC', now: new Date('2026-03-02T10:00:00Z') })).toBe(1);
	});

	test('judges today in the given timezone', () => {
		expect(
			todayIndex({ days, timezone: 'Asia/Tokyo', now: new Date('2026-03-01T20:00:00Z') })
		).toBe(1);
	});

	test('falls back to the first day', () => {
		expect(todayIndex({ days, timezone: 'UTC', now: new Date('2030-01-01T00:00:00Z') })).toBe(0);
	});
});

describe('entryTrackSummary', () => {
	const day = {
		tracks: [
			{ id: 'a', name: 'A', description: 'first', sortOrder: 0 },
			{ id: 'b', name: 'B', description: null, sortOrder: 1 }
		]
	};

	test('is null without a selection', () => {
		expect(entryTrackSummary({ day: null, entry: null })).toBeNull();
		expect(entryTrackSummary({ day, entry: { tracks: [] } })).toBeNull();
	});

	test('is the single track of the entry', () => {
		expect(entryTrackSummary({ day, entry: { tracks: [{ id: 'b' }] } })).toEqual(day.tracks[1]);
	});

	test('joins several track names', () => {
		expect(entryTrackSummary({ day, entry: { tracks: [{ id: 'a' }, { id: 'b' }] } })).toEqual({
			name: 'A, B',
			description: null
		});
	});
});
