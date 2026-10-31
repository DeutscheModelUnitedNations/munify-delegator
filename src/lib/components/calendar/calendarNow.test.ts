import { describe, expect, test } from 'vitest';
import { entriesForSeat, seatNamesOf, timelineOf, wallClockNow } from './calendarNow';

const at = (iso: string) => new Date(`${iso}Z`);
const entry = (name: string, start: string, end: string, tracks: string[] = []) => ({
	name,
	startTime: at(start),
	endTime: at(end),
	tracks: tracks.map((id) => ({ id }))
});

// Berlin is UTC+2 in October: 07:30Z is 09:30 on the wall clock the entries are written in.
const NOW = new Date('2026-10-11T07:30:00Z');

describe('wallClockNow', () => {
	test('turns an instant into the conference timezone wall clock, as UTC', () => {
		expect(new Date(wallClockNow({ timezone: 'Europe/Berlin', now: NOW })).toISOString()).toBe(
			'2026-10-11T09:30:00.000Z'
		);
		expect(new Date(wallClockNow({ timezone: 'UTC', now: NOW })).toISOString()).toBe(
			'2026-10-11T07:30:00.000Z'
		);
	});
});

describe('entriesForSeat', () => {
	const days = [
		{
			tracks: [
				{ id: 'sr-1', name: 'Sicherheitsrat' },
				{ id: 'press-1', name: 'GV Presse' },
				{ id: 'imo-1', name: 'IMO MRR' }
			],
			entries: [
				entry('For everyone', '2026-10-11T10:00', '2026-10-11T11:00'),
				// Shared entries are stored linked to every track of the day
				entry('On all tracks', '2026-10-11T10:30', '2026-10-11T11:00', [
					'sr-1',
					'press-1',
					'imo-1'
				]),
				entry('Council', '2026-10-11T11:00', '2026-10-11T12:00', ['sr-1']),
				entry('Press', '2026-10-11T11:00', '2026-10-11T12:00', ['press-1']),
				entry('Both', '2026-10-11T12:00', '2026-10-11T13:00', ['sr-1', 'press-1'])
			]
		},
		{
			// Tracks belong to a day: the same committee has another id the next day
			tracks: [
				{ id: 'sr-2', name: 'sicherheitsrat ' },
				{ id: 'imo-2', name: 'IMO MRR' }
			],
			entries: [entry('Next day council', '2026-10-12T09:00', '2026-10-12T10:00', ['sr-2'])]
		}
	];

	test('keeps the entries for every track and those on the seat’s own track, on every day', () => {
		const names = entriesForSeat({ days, seatNames: ['Sicherheitsrat', 'SR'] }).map((e) => e.name);
		expect(names).toEqual(['For everyone', 'On all tracks', 'Council', 'Both', 'Next day council']);
	});

	test('matches the name without caring for case or spacing', () => {
		expect(entriesForSeat({ days, seatNames: ['  gv   presse'] }).map((e) => e.name)).toEqual([
			'For everyone',
			'On all tracks',
			'Press',
			'Both'
		]);
	});

	test('someone whose seat matches no track gets every entry once', () => {
		const names = entriesForSeat({ days, seatNames: [] }).map((e) => e.name);
		expect(names).toContain('Council');
		expect(names).toContain('Press');
		expect(new Set(names).size).toBe(names.length);
	});
});

describe('timelineOf', () => {
	const entries = [
		entry('Sitzung III', '2026-10-11T07:00', '2026-10-11T09:00'),
		entry('Mittagspause', '2026-10-11T09:00', '2026-10-11T10:00'),
		entry('Workshop', '2026-10-11T10:00', '2026-10-11T11:30'),
		entry('Abend', '2026-10-11T16:00', '2026-10-11T18:00'),
		entry('Sitzung V', '2026-10-12T08:00', '2026-10-12T10:00')
	];

	test('names what is running and the next two to start', () => {
		const { current, upcoming } = timelineOf({ entries, timezone: 'Europe/Berlin', now: NOW });
		expect(current?.name).toBe('Mittagspause');
		expect(upcoming.map((u) => u.entry.name)).toEqual(['Workshop', 'Abend']);
		expect(upcoming.map((u) => u.newDay)).toEqual([false, false]);
	});

	test('marks the entry where another day begins, counting from today', () => {
		const evening = new Date('2026-10-11T15:00:00Z');
		const { upcoming } = timelineOf({ entries, timezone: 'Europe/Berlin', now: evening });
		expect(upcoming.map((u) => [u.entry.name, u.newDay])).toEqual([['Sitzung V', true]]);
	});

	test('marks a day change in the middle of the timeline', () => {
		const lateMorning = new Date('2026-10-11T08:30:00Z');
		const { upcoming } = timelineOf({ entries, timezone: 'Europe/Berlin', now: lateMorning });
		expect(upcoming.map((u) => [u.entry.name, u.newDay])).toEqual([
			['Abend', false],
			['Sitzung V', true]
		]);
	});

	test('an entry that ended exactly now is over and one that starts now is running', () => {
		const atNine = new Date('2026-10-11T07:00:00Z');
		expect(timelineOf({ entries, timezone: 'Europe/Berlin', now: atNine }).current?.name).toBe(
			'Mittagspause'
		);
	});

	test('between entries there is nothing running', () => {
		const gap = new Date('2026-10-11T17:00:00Z');
		const { current, upcoming } = timelineOf({ entries, timezone: 'Europe/Berlin', now: gap });
		expect(current).toBeUndefined();
		expect(upcoming.map((u) => u.entry.name)).toEqual(['Sitzung V']);
	});

	test('nothing is left after the last entry', () => {
		const after = new Date('2026-10-13T12:00:00Z');
		expect(timelineOf({ entries, timezone: 'Europe/Berlin', now: after })).toEqual({
			current: undefined,
			upcoming: []
		});
	});
});

describe('seatNamesOf', () => {
	test('names the committee, non-state actor and role of a seat', () => {
		expect(
			seatNamesOf({
				delegationMember: {
					assignedCommittee: { name: 'Security Council', abbreviation: 'SC' },
					delegation: { assignedRole: { name: 'Red Cross', abbreviation: null } }
				},
				singleParticipant: { assignedRole: { name: 'Press' } }
			})
		).toEqual(['Security Council', 'SC', 'Red Cross', 'Press']);
	});

	test('a visitor or an unassigned seat has no names', () => {
		expect(seatNamesOf(undefined)).toEqual([]);
		expect(seatNamesOf({ delegationMember: null, singleParticipant: null })).toEqual([]);
	});
});
