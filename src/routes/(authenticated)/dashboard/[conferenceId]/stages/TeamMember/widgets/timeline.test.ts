import { describe, expect, test } from 'vitest';
import {
	calendarDaysUntil,
	detailOf,
	dueNextState,
	linkOf,
	milestonesOf,
	visibleMilestones,
	whenOf,
	type TimelineConference
} from './timeline';

const conference: TimelineConference = {
	state: 'PREPARATION',
	applicationDeadline: new Date(2026, 9, 1, 23, 59),
	registrationDeadlineGracePeriodMinutes: 30,
	paymentDeadline: new Date(2026, 11, 5),
	assignmentReleased: true,
	assignmentReleasedAt: new Date(2026, 9, 12),
	startConference: new Date(2027, 0, 14),
	endConference: new Date(2027, 0, 17)
};
const now = new Date(2026, 10, 27, 12);

describe('milestonesOf', () => {
	test('orders the dates and marks the passed ones done', () => {
		const milestones = milestonesOf({
			conference,
			surveys: [{ id: 's', title: 'Workshops', deadline: new Date(2026, 11, 1) }],
			now
		});
		expect(milestones.map((m) => [m.kind, m.done])).toEqual([
			['applicationDeadline', true],
			['assignmentReleased', true],
			['surveyDeadline', false],
			['paymentDeadline', false],
			['conferenceStart', false],
			['conferenceEnd', false]
		]);
	});

	test('the application deadline includes the grace period', () => {
		const [deadline] = milestonesOf({ conference, surveys: [], now });
		expect(deadline.at).toEqual(new Date(2026, 9, 2, 0, 29));
	});

	test('leaves out a missing payment deadline and an unreleased assignment', () => {
		const kinds = milestonesOf({
			conference: { ...conference, paymentDeadline: null, assignmentReleased: false },
			surveys: [],
			now
		}).map((m) => m.kind);
		expect(kinds).not.toContain('paymentDeadline');
		expect(kinds).not.toContain('assignmentReleased');
	});
});

describe('visibleMilestones', () => {
	test('the latest done one and the next three', () => {
		const shown = visibleMilestones({
			milestones: milestonesOf({ conference, surveys: [], now })
		});
		expect(shown.map((m) => m.kind)).toEqual([
			'assignmentReleased',
			'paymentDeadline',
			'conferenceStart',
			'conferenceEnd'
		]);
	});
});

describe('calendarDaysUntil', () => {
	test('counts calendar days, not 24-hour spans', () => {
		expect(
			calendarDaysUntil({ at: new Date(2026, 10, 28, 1), now: new Date(2026, 10, 27, 23) })
		).toBe(1);
		expect(
			calendarDaysUntil({ at: new Date(2026, 10, 27, 23), now: new Date(2026, 10, 27, 1) })
		).toBe(0);
		expect(calendarDaysUntil({ at: new Date(2026, 10, 26), now })).toBe(-1);
	});
});

describe('dueNextState', () => {
	test('preparation once the applications closed', () => {
		expect(
			dueNextState({ conference: { ...conference, state: 'PARTICIPANT_REGISTRATION' }, now })
		).toBe('PREPARATION');
		expect(
			dueNextState({
				conference: { ...conference, state: 'PARTICIPANT_REGISTRATION' },
				now: new Date(2026, 9, 2, 0, 10)
			})
		).toBeUndefined();
	});

	test('the conference from a day before it starts', () => {
		expect(dueNextState({ conference, now })).toBeUndefined();
		expect(dueNextState({ conference, now: new Date(2027, 0, 13, 9) })).toBe('ACTIVE');
	});

	test('the wrap-up once it ended', () => {
		const active = { ...conference, state: 'ACTIVE' as const };
		expect(dueNextState({ conference: active, now: new Date(2027, 0, 16) })).toBeUndefined();
		expect(dueNextState({ conference: active, now: new Date(2027, 0, 18) })).toBe('POST');
	});

	test('nothing before the registration or after the end', () => {
		expect(dueNextState({ conference: { ...conference, state: 'PRE' }, now })).toBeUndefined();
		expect(dueNextState({ conference: { ...conference, state: 'POST' }, now })).toBeUndefined();
	});
});

describe('whenOf, detailOf and linkOf', () => {
	const [payment] = milestonesOf({
		conference: { ...conference, assignmentReleased: false },
		surveys: [],
		now
	}).filter((milestone) => milestone.kind === 'paymentDeadline');
	const [survey] = milestonesOf({
		conference,
		surveys: [{ id: 's', title: 'Workshops', deadline: new Date(2026, 11, 1), unanswered: 4 }],
		now
	}).filter((milestone) => milestone.kind === 'surveyDeadline');
	const sight = { unpaid: 7, seesPayments: true, seesSurveys: true };

	test('when: done, today, tomorrow or in days', () => {
		expect(whenOf({ milestone: payment, now })).toEqual({ kind: 'inDays', days: 8 });
		expect(whenOf({ milestone: payment, now: new Date(2026, 11, 4, 9) })).toEqual({
			kind: 'tomorrow'
		});
		expect(whenOf({ milestone: { ...payment, done: true }, now })).toEqual({ kind: 'done' });
		expect(
			whenOf({ milestone: { ...payment, done: false }, now: new Date(2026, 11, 5, 9) })
		).toEqual({ kind: 'today' });
	});

	test('details only where the caller sees them and they are not zero', () => {
		expect(detailOf({ milestone: payment, sight })).toEqual({ kind: 'unpaid', count: 7 });
		expect(detailOf({ milestone: payment, sight: { ...sight, unpaid: 0 } })).toBeUndefined();
		expect(detailOf({ milestone: survey, sight })).toEqual({ kind: 'unanswered', count: 4 });
		expect(
			detailOf({ milestone: survey, sight: { ...sight, seesSurveys: false } })
		).toBeUndefined();
		expect(detailOf({ milestone: { ...payment, done: true }, sight })).toBeUndefined();
	});

	test('links only to pages the caller may open', () => {
		expect(linkOf({ milestone: payment, sight })).toEqual({ page: 'payments' });
		expect(linkOf({ milestone: survey, sight })).toEqual({ page: 'survey', surveyId: 's' });
		expect(
			linkOf({ milestone: payment, sight: { ...sight, seesPayments: false } })
		).toBeUndefined();
	});
});
