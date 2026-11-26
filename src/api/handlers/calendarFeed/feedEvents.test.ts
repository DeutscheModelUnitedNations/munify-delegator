import { describe, expect, test } from 'vitest';
import { feedEvents, type FeedSchedule } from './feedEvents';

const entry = ({ id, name = id, tracks }: { id: string; name?: string; tracks: string[] }) => ({
	id,
	name,
	description: null,
	startTime: new Date('2026-02-20T09:00:00Z'),
	endTime: new Date('2026-02-20T10:00:00Z'),
	room: null,
	updatedAt: new Date('2026-01-01T00:00:00Z'),
	tracks: tracks.map((trackId) => ({ id: trackId })),
	place: null
});

const schedule = ({
	committeeId,
	roleId
}: {
	committeeId?: string;
	roleId?: string;
}): FeedSchedule => ({
	calendarDays: [
		{
			tracks: [
				{ id: 'gaTrack', committees: [{ id: 'ga' }], conferenceRoles: [] },
				{ id: 'scTrack', committees: [{ id: 'sc' }], conferenceRoles: [] },
				{ id: 'pressTrack', committees: [], conferenceRoles: [{ id: 'press' }] }
			],
			entries: [
				entry({ id: 'opening', tracks: ['gaTrack', 'scTrack', 'pressTrack'] }),
				entry({ id: 'ga1', name: 'Session 1', tracks: ['gaTrack'] }),
				entry({ id: 'sc1', name: 'Session 1', tracks: ['scTrack'] }),
				entry({ id: 'pressBriefing', tracks: ['pressTrack'] })
			]
		}
	],
	delegationMembers: committeeId
		? [{ assignedCommittee: { id: committeeId }, delegation: { assignedRole: null } }]
		: [],
	singleParticipants: roleId ? [{ assignedRole: { id: roleId } }] : []
});

const ids = (s: FeedSchedule) => feedEvents(s).map((event) => event.id);

describe('feedEvents', () => {
	test("a delegate gets the shared entries and their committee's track", () => {
		expect(ids(schedule({ committeeId: 'sc' })).toSorted()).toEqual(['opening', 'sc1']);
	});

	test("a single participant gets their role's track", () => {
		expect(ids(schedule({ roleId: 'press' })).toSorted()).toEqual(['opening', 'pressBriefing']);
	});

	test('someone without a seat gets every entry, parallel copies once', () => {
		const events = feedEvents(schedule({}));
		expect(events.map((event) => event.name).toSorted()).toEqual([
			'Session 1',
			'opening',
			'pressBriefing'
		]);
		// the merged copy keeps the same id on every fetch
		expect(events.find((event) => event.name === 'Session 1')?.id).toBe('ga1');
	});
});
