import { GraphQLError } from 'graphql';
import { describe, expect, test } from 'vitest';
import { scheduleOfResult } from './feedScheduleQuery';

const answer = {
	conferences: [{ id: 'c1', title: 'MUN 2026', timezone: 'Europe/Berlin' }],
	calendarDays: [
		{
			id: 'd1',
			tracks: [{ id: 't1', committees: [], conferenceRoles: [] }],
			entries: [
				{
					id: 'e1',
					name: 'Opening',
					description: null,
					startTime: '2026-02-20T09:00:00.000Z',
					endTime: '2026-02-20T10:00:00.000Z',
					room: null,
					updatedAt: '2026-01-01T00:00:00.000Z',
					tracks: [{ id: 't1' }],
					place: null
				}
			]
		}
	],
	delegationMembers: [],
	singleParticipants: []
};

describe('scheduleOfResult', () => {
	test('reads the conference and its events, times as dates', () => {
		const schedule = scheduleOfResult({ data: answer });
		expect(schedule?.title).toBe('MUN 2026');
		expect(schedule?.timezone).toBe('Europe/Berlin');
		expect(schedule?.events.map((event) => event.id)).toEqual(['e1']);
		expect(schedule?.events[0]?.startTime).toEqual(new Date('2026-02-20T09:00:00.000Z'));
	});

	test('is undefined for a conference the caller may not read', () => {
		expect(scheduleOfResult({ data: { ...answer, conferences: [] } })).toBeUndefined();
	});

	test('throws when the API answered with errors', () => {
		expect(() => scheduleOfResult({ errors: [new GraphQLError('nope')] })).toThrow();
	});
});
