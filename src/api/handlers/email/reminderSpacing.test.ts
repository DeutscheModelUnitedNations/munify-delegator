import { describe, expect, it } from 'vitest';
import type { DueEmail, SnapshotUser } from './dueEmails';
import { spaceReminders } from './reminderSpacing';

const DAY = 24 * 60 * 60 * 1000;
const now = new Date('2027-03-01T08:00:00Z');
const user = (id: string): SnapshotUser => ({
	id,
	email: `${id}@example.org`,
	givenName: id,
	familyName: 'X',
	locale: 'de',
	birthday: null
});
const mail = ({
	kind,
	to = 'anna',
	daysLeft
}: {
	kind: DueEmail['kind'];
	to?: string;
	daysLeft?: number;
}): DueEmail => ({
	kind,
	subjectKey: kind,
	recipient: user(to),
	...(daysLeft === undefined ? {} : { remindsOf: new Date(now.getTime() + daysLeft * DAY) })
});

describe('spaceReminders', () => {
	it('sends one reminder per person at a time, the others wait', () => {
		const due = [
			mail({ kind: 'OPEN_ISSUES_REMINDER', daysLeft: 9 }),
			mail({ kind: 'CHASE_INTRO_REMINDER', daysLeft: 9 }),
			mail({ kind: 'CHASE_INTRO_REMINDER', to: 'bob', daysLeft: 9 })
		];
		expect(spaceReminders({ due, lastReminderAt: new Map(), now }).map((m) => m.kind)).toEqual([
			'OPEN_ISSUES_REMINDER',
			'CHASE_INTRO_REMINDER'
		]);
	});

	it('holds a reminder within two days of the last one, then lets it go', () => {
		const due = [mail({ kind: 'PHONE_READY_REMINDER', daysLeft: 6 })];
		const yesterday = new Map([['anna', new Date(now.getTime() - DAY)]]);
		const threeDaysAgo = new Map([['anna', new Date(now.getTime() - 3 * DAY)]]);
		expect(spaceReminders({ due, lastReminderAt: yesterday, now })).toEqual([]);
		expect(spaceReminders({ due, lastReminderAt: threeDaysAgo, now })).toEqual(due);
	});

	it("sends a reminder on its window's last day anyway", () => {
		const due = [mail({ kind: 'SURVEY_REMINDER', daysLeft: 0.5 })];
		const anHourAgo = new Map([['anna', new Date(now.getTime() - 60 * 60 * 1000)]]);
		expect(spaceReminders({ due, lastReminderAt: anHourAgo, now })).toEqual(due);
	});

	it('never holds back a mail that reports something', () => {
		const due = [mail({ kind: 'PAYMENT_RECEIVED' }), mail({ kind: 'PAPER_REVIEWED' })];
		const anHourAgo = new Map([['anna', new Date(now.getTime() - 60 * 60 * 1000)]]);
		expect(spaceReminders({ due, lastReminderAt: anHourAgo, now })).toEqual(due);
	});
});
