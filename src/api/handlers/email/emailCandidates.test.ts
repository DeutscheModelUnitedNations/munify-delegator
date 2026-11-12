import { describe, expect, test, vi } from 'vitest';
import { PgDialect } from 'drizzle-orm/pg-core';
import type { SQL } from 'drizzle-orm';
import type { EmailSnapshot } from './dueEmails';

vi.mock('#api/db/db', () => ({ db: {}, schema: {} }));

const { conferenceParticipant } = await import('#api/db/schema/participants');
const { participantCandidates, teamCandidates, waitingListCandidates } =
	await import('./emailCandidates');

const DAY = 24 * 60 * 60 * 1000;
const now = new Date('2026-11-01T12:00:00Z');
const dialect = new PgDialect();
const render = (query: SQL) => dialect.sqlToQuery(query);

const conference: EmailSnapshot['conference'] = {
	id: 'c1',
	title: 'MUN',
	state: 'PREPARATION',
	assignmentReleased: true,
	unlockPostals: false,
	unlockPayments: false,
	applicationDeadline: new Date(now.getTime() - 30 * DAY),
	startConference: new Date(now.getTime() + 60 * DAY),
	timezone: 'Europe/Berlin',
	certificateAvailable: false,
	chaseUrl: null
};

/** Which kinds the filter asks the log about. */
const kindsIn = (query: SQL) => {
	const { sql, params } = render(query);
	expect(sql).not.toMatch(/undefined/);
	return new Set(params.filter((param) => typeof param === 'string' && /^[A-Z_]+$/.test(param)));
};
const filter = (kinds: string[], overrides: Partial<typeof conference> = {}) =>
	participantCandidates({
		conference: { ...conference, ...overrides },
		kinds: new Set(kinds),
		now,
		row: conferenceParticipant
	});

describe('participantCandidates', () => {
	test('matches nobody when no kind asked for can be owed', () => {
		expect(render(filter([])).sql).toBe('false');
		// applications are confirmed only until the release
		expect(render(filter(['APPLICATION_SENT'])).sql).toBe('false');
		// the delegation mails only while registration is open
		expect(render(filter(['DELEGATION_CREATED', 'DELEGATION_MEMBER_JOINED'])).sql).toBe('false');
		// the unlocked mails only once unlocked
		expect(render(filter(['POSTAL_UNLOCKED', 'PAYMENT_UNLOCKED'])).sql).toBe('false');
	});

	test('asks only about the kinds the conference can owe now', () => {
		const kinds = kindsIn(
			filter(['APPLICATION_SENT', 'ASSIGNMENT_ACCEPTED', 'PAPER_REVIEWED'], {
				assignmentReleased: false
			})
		);
		expect(kinds).toEqual(new Set(['APPLICATION_SENT', 'PAPER_REVIEWED']));
	});

	test('opens the reminders only in their windows', () => {
		const soon = { startConference: new Date(now.getTime() + 5 * DAY) };
		expect(kindsIn(filter(['PHONE_READY_REMINDER'], soon))).toEqual(
			new Set(['PHONE_READY_REMINDER'])
		);
		expect(render(filter(['PHONE_READY_REMINDER'])).sql).toBe('false');
		const deadline = {
			state: 'PARTICIPANT_REGISTRATION' as const,
			assignmentReleased: false,
			applicationDeadline: new Date(now.getTime() + 2 * DAY)
		};
		const reminder = render(filter(['APPLICATION_DEADLINE_REMINDER'], deadline));
		// keyed by the deadline's day, as `dueEmails` keys it
		expect(reminder.params).toContain('2026-11-03');
		expect(render(filter(['APPLICATION_DEADLINE_REMINDER'])).sql).toBe('false');
	});

	test('gives up on a mail only after the last try', () => {
		const { sql, params } = render(filter(['PAPER_REVIEWED']));
		expect(sql).toMatch(/l\.status in \('SENT', 'SKIPPED'\)/);
		expect(params).toContain(3);
	});
});

describe('waiting list and team', () => {
	test('ask the log about their own kind', () => {
		const ids = {
			conferenceId: 'c1',
			id: conferenceParticipant.id,
			userId: conferenceParticipant.userId
		};
		expect(render(waitingListCandidates(ids)).params).toContain('WAITING_LIST_REGISTERED');
		expect(render(teamCandidates(ids)).params).toContain('TEAM_WELCOME');
	});
});
