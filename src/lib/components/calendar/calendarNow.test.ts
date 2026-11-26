import { describe, expect, test } from 'vitest';
import {
	entriesForSeat,
	leadOfTimeline,
	placeLine,
	seatOf,
	startsIn,
	timelineOf,
	wallClockNow
} from './calendarNow';

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
	const track = ({
		id,
		committees = [],
		roles = []
	}: {
		id: string;
		committees?: string[];
		roles?: string[];
	}) => ({
		id,
		committees: committees.map((committee) => ({ id: committee })),
		conferenceRoles: roles.map((role) => ({ id: role }))
	});
	const council = track({ id: 'sr', committees: ['committee-sr'] });
	const press = track({ id: 'press', roles: ['role-press'] });
	const imo = track({ id: 'imo', committees: ['committee-imo'] });
	const days = [
		{
			tracks: [council, press, imo],
			entries: [
				entry('For everyone', '2026-10-11T10:00', '2026-10-11T11:00'),
				// Shared entries are stored linked to every track of the day
				entry('On all tracks', '2026-10-11T10:30', '2026-10-11T11:00', ['sr', 'press', 'imo']),
				entry('Council', '2026-10-11T11:00', '2026-10-11T12:00', ['sr']),
				entry('Press', '2026-10-11T11:00', '2026-10-11T12:00', ['press']),
				entry('Both', '2026-10-11T12:00', '2026-10-11T13:00', ['sr', 'press'])
			]
		},
		{
			// A track runs on some days only
			tracks: [council, imo],
			entries: [entry('Next day council', '2026-10-12T09:00', '2026-10-12T10:00', ['sr'])]
		}
	];
	const seat = (seat: Partial<Parameters<typeof entriesForSeat>[0]['seat']>) => ({
		committeeIds: [],
		roleIds: [],
		...seat
	});

	test('keeps the entries for every track and those on a track for the committee, on every day', () => {
		const names = entriesForSeat({ days, seat: seat({ committeeIds: ['committee-sr'] }) }).map(
			(e) => e.name
		);
		expect(names).toEqual(['For everyone', 'On all tracks', 'Council', 'Both', 'Next day council']);
	});

	test('a track can be for a role', () => {
		expect(
			entriesForSeat({ days, seat: seat({ roleIds: ['role-press'] }) }).map((e) => e.name)
		).toEqual(['For everyone', 'On all tracks', 'Press', 'Both']);
	});

	test('someone whose seat no track is for gets every entry once', () => {
		const names = entriesForSeat({ days, seat: seat({ committeeIds: ['committee-gv'] }) }).map(
			(e) => e.name
		);
		expect(names).toContain('Council');
		expect(names).toContain('Press');
		expect(new Set(names).size).toBe(names.length);
	});

	describe('parallel copies of one session, for someone without a track', () => {
		const session = ({
			trackId,
			place,
			room
		}: {
			trackId: string;
			place: string;
			room: string;
		}) => ({
			...entry('Sitzung', '2026-10-11T11:00', '2026-10-11T12:00', [trackId]),
			place: { id: place, name: place },
			room
		});
		const merged = (entries: ReturnType<typeof session>[]) =>
			entriesForSeat({ days: [{ tracks: [council, press], entries }], seat: seat({}) });

		test('are one entry on all their tracks, without the rooms they differ in', () => {
			const [only, ...rest] = merged([
				session({ trackId: 'sr', place: 'Landtag', room: '201' }),
				session({ trackId: 'press', place: 'Landtag', room: '202' })
			]);
			expect(rest).toEqual([]);
			expect(only).toMatchObject({
				tracks: [{ id: 'sr' }, { id: 'press' }],
				place: { name: 'Landtag' },
				room: null
			});
		});

		test('name no place and no room when they are at different places', () => {
			const [only] = merged([
				session({ trackId: 'sr', place: 'Landtag', room: '1' }),
				session({ trackId: 'press', place: 'Kulturzentrum', room: '1' })
			]);
			expect(only).toMatchObject({ place: null, room: null });
		});

		test('keep the place and room they share', () => {
			const [only] = merged([
				session({ trackId: 'sr', place: 'Landtag', room: '1' }),
				session({ trackId: 'press', place: 'Landtag', room: '1' })
			]);
			expect(only).toMatchObject({ place: { name: 'Landtag' }, room: '1' });
		});
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
		expect(current.map((e) => e.name)).toEqual(['Mittagspause']);
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
		const { current } = timelineOf({ entries, timezone: 'Europe/Berlin', now: atNine });
		expect(current.map((e) => e.name)).toEqual(['Mittagspause']);
	});

	test('names everything that runs at the same time, the earlier start first', () => {
		const parallel = [
			entry('Pressekonferenz', '2026-10-11T09:15', '2026-10-11T09:45'),
			entry('Sprechstunde', '2026-10-11T08:00', '2026-10-11T12:00')
		];
		const { current } = timelineOf({ entries: parallel, timezone: 'Europe/Berlin', now: NOW });
		expect(current.map((e) => e.name)).toEqual(['Sprechstunde', 'Pressekonferenz']);
	});

	test('between entries there is nothing running', () => {
		const gap = new Date('2026-10-11T17:00:00Z');
		const { current, upcoming } = timelineOf({ entries, timezone: 'Europe/Berlin', now: gap });
		expect(current).toEqual([]);
		expect(upcoming.map((u) => u.entry.name)).toEqual(['Sitzung V']);
	});

	test('nothing is left after the last entry', () => {
		const after = new Date('2026-10-13T12:00:00Z');
		expect(timelineOf({ entries, timezone: 'Europe/Berlin', now: after })).toEqual({
			current: [],
			upcoming: []
		});
	});
});

describe('leadOfTimeline', () => {
	const upcoming = ['a', 'b', 'c', 'd'].map((entry) => ({ entry, newDay: false }));
	const names = (list: readonly { entry: string }[]) => list.map(({ entry }) => entry);

	test('leads with everything running, then what comes next', () => {
		const lead = leadOfTimeline({ timeline: { current: ['x', 'y'], upcoming }, count: 3 });
		expect(lead.running).toEqual(['x', 'y']);
		expect(lead.next).toBeUndefined();
		expect(names(lead.following)).toEqual(['a', 'b', 'c']);
	});

	test('leads with the next entry when nothing is running', () => {
		const lead = leadOfTimeline({ timeline: { current: [], upcoming }, count: 3 });
		expect(lead.next?.entry).toBe('a');
		expect(names(lead.following)).toEqual(['b', 'c', 'd']);
	});

	test('keeps everything when little is left', () => {
		const little = { current: ['x'], upcoming: upcoming.slice(0, 1) };
		expect(names(leadOfTimeline({ timeline: little, count: 3 }).following)).toEqual(['a']);
		const nothing = leadOfTimeline({ timeline: { current: [], upcoming: [] }, count: 3 });
		expect(nothing).toEqual({ running: [], next: undefined, following: [] });
	});
});

describe('startsIn', () => {
	// 09:30 on the wall clock
	const until = (start: string, locale = 'en') =>
		startsIn({ startTime: at(start), timezone: 'Europe/Berlin', now: NOW, locale });

	test('counts minutes within the hour', () => {
		expect(until('2026-10-11T09:31')).toBe('in 1 minute');
		expect(until('2026-10-11T10:29', 'de')).toBe('in 59 Minuten');
	});

	test('counts full hours on the same day, never more than are left', () => {
		expect(until('2026-10-11T10:30')).toBe('in 1 hour');
		expect(until('2026-10-11T12:25')).toBe('in 2 hours');
	});

	test('counts days from the next day on', () => {
		expect(until('2026-10-12T08:00')).toBe('tomorrow');
		expect(until('2026-10-14T23:00', 'de')).toBe('in 3 Tagen');
	});

	test('counts minutes across midnight', () => {
		const late = new Date('2026-10-11T21:50:00Z');
		expect(
			startsIn({
				startTime: at('2026-10-12T00:10'),
				timezone: 'Europe/Berlin',
				now: late,
				locale: 'en'
			})
		).toBe('in 20 minutes');
	});
});

describe('placeLine', () => {
	test('joins the place and the room, whichever is known', () => {
		expect(placeLine({ place: { name: 'Landtag' }, room: '201' })).toBe('Landtag · 201');
		expect(placeLine({ place: null, room: '201' })).toBe('201');
		expect(placeLine({ place: { name: 'Landtag' } })).toBe('Landtag');
		expect(placeLine({})).toBe('');
	});
});

describe('seatOf', () => {
	test('is the committee and the roles of a seat', () => {
		expect(
			seatOf({
				delegationMember: {
					assignedCommittee: { id: 'committee-sc' },
					delegation: { assignedRole: { id: 'role-red-cross' } }
				},
				singleParticipant: { assignedRole: { id: 'role-press' } }
			})
		).toEqual({ committeeIds: ['committee-sc'], roleIds: ['role-red-cross', 'role-press'] });
	});

	test('a visitor or an unassigned seat has none', () => {
		const none = { committeeIds: [], roleIds: [] };
		expect(seatOf(undefined)).toEqual(none);
		expect(seatOf({ delegationMember: null, singleParticipant: null })).toEqual(none);
	});
});
