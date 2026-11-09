import { describe, expect, test } from 'vitest';
import { ownTrackIds, personalCalendarDays, type PersonalDay } from './personalCalendar';

const track = ({
	id,
	committee,
	sortOrder
}: {
	id: string;
	committee: string;
	sortOrder: number;
}) => ({
	id,
	name: id,
	sortOrder,
	committees: [{ id: committee }],
	conferenceRoles: []
});

const entry = ({
	id,
	hour,
	tracks = [],
	surveyOptions = []
}: {
	id: string;
	hour: number;
	tracks?: string[];
	surveyOptions?: string[];
}) => ({
	id,
	name: id,
	color: 'SESSION' as const,
	startTime: new Date(Date.UTC(2026, 4, 21, hour)),
	endTime: new Date(Date.UTC(2026, 4, 21, hour + 1)),
	tracks: tracks.map((trackId) => ({ id: trackId })),
	surveyOptions: surveyOptions.map((optionId) => ({ id: optionId }))
});

const day = (entries: PersonalDay['entries']): PersonalDay => ({
	id: 'd1',
	name: 'Day 1',
	date: new Date(Date.UTC(2026, 4, 21)),
	tracks: [
		track({ id: 'b', committee: 'c2', sortOrder: 2 }),
		track({ id: 'a', committee: 'c1', sortOrder: 1 })
	],
	entries
});

const ids = (days: PersonalDay[]) => days.flatMap((d) => d.entries.map((e) => e.id));

describe('personalCalendarDays', () => {
	const days = [
		day([
			entry({ id: 'committee-b', hour: 10, tracks: ['b'] }),
			entry({ id: 'committee-a', hour: 10, tracks: ['a'] }),
			entry({ id: 'plenary', hour: 9 }),
			entry({ id: 'shared', hour: 12, tracks: ['a', 'b'] }),
			entry({ id: 'excursion', hour: 14, surveyOptions: ['o1'] }),
			entry({ id: 'workshop', hour: 15, surveyOptions: ['o2', 'o3'] })
		])
	];

	test('keeps every track and the entries of the picked survey choices, in time order', () => {
		const result = personalCalendarDays({ days, pickedOptionIds: ['o3'] });
		expect(ids(result)).toEqual(['plenary', 'committee-b', 'committee-a', 'shared', 'workshop']);
		expect(result[0].tracks.map((t) => t.id)).toEqual(['a', 'b']);
	});

	test('without survey choices, only the entries for everybody', () => {
		const result = personalCalendarDays({ days, pickedOptionIds: [] });
		expect(ids(result)).toEqual(['plenary', 'committee-b', 'committee-a', 'shared']);
	});
});

describe('ownTrackIds', () => {
	const days = [day([])];

	test('names the tracks for the seat', () => {
		expect(ownTrackIds({ days, seat: { committeeIds: ['c2'], roleIds: [] } })).toEqual(['b']);
	});

	test('names none when no track is for the seat', () => {
		expect(ownTrackIds({ days, seat: { committeeIds: [], roleIds: [] } })).toEqual([]);
	});
});
