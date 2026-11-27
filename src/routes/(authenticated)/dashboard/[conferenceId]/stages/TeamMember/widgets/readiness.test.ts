import { describe, expect, test } from 'vitest';
import { conferenceDays, readinessChecks, type ReadinessFacts } from './readiness';

const facts: ReadinessFacts = {
	committeeSeats: 120,
	applicationDeadline: '2026-12-01T23:59:00Z',
	feeAmount: 85,
	iban: 'DE00',
	contractFileId: 'f1',
	guidePublished: true,
	startConference: '2027-01-14T00:00:00Z',
	endConference: '2027-01-17T00:00:00Z',
	calendarDays: ['2027-01-14', '2027-01-15', '2027-01-16', '2027-01-17'],
	discussionPointCounts: [3, 2],
	certificateFileId: 'f2',
	checkSessions: 1
};
const now = new Date('2026-11-27T12:00:00Z');
const status = (items: ReturnType<typeof readinessChecks>) =>
	Object.fromEntries(items.map((item) => [item.id, item.done]));

describe('readinessChecks', () => {
	test('before the registration: seats, deadline, fee, bank details and documents', () => {
		expect(status(readinessChecks({ state: 'PRE', facts, now }))).toEqual({
			committees: true,
			applicationDeadline: true,
			fee: true,
			bankDetails: true,
			documents: true
		});
	});

	test('a deadline in the past, no fee and no seats are open', () => {
		const items = readinessChecks({
			state: 'PRE',
			facts: { ...facts, committeeSeats: 0, feeAmount: null, applicationDeadline: '2026-11-01' },
			now
		});
		expect(status(items)).toMatchObject({
			committees: false,
			applicationDeadline: false,
			fee: false
		});
	});

	test('before the conference: guide, schedule, points, certificate, check-in', () => {
		expect(status(readinessChecks({ state: 'PREPARATION', facts, now }))).toEqual({
			guide: true,
			calendar: true,
			discussionPoints: true,
			certificate: true,
			checkSession: true
		});
	});

	test('counts the days without a schedule and the agenda items without points', () => {
		const items = readinessChecks({
			state: 'PREPARATION',
			facts: { ...facts, calendarDays: ['2027-01-14'], discussionPointCounts: [0, 1, 0] },
			now
		});
		expect(items.find((item) => item.id === 'calendar')).toMatchObject({ done: false, missing: 3 });
		expect(items.find((item) => item.id === 'discussionPoints')).toMatchObject({
			done: false,
			missing: 2
		});
	});

	test('no agenda items is not done, and counts nothing', () => {
		const item = readinessChecks({
			state: 'PREPARATION',
			facts: { ...facts, discussionPointCounts: [] },
			now
		}).find((entry) => entry.id === 'discussionPoints');
		expect(item).toMatchObject({ done: false, missing: undefined });
	});

	test('CHASE only while linked: done once read back and nothing kept back', () => {
		expect(readinessChecks({ state: 'PREPARATION', facts, now }).map((i) => i.id)).not.toContain(
			'chase'
		);
		const linked = (chase: ReadinessFacts['chase']) =>
			readinessChecks({ state: 'PREPARATION', facts: { ...facts, chase }, now }).find(
				(item) => item.id === 'chase'
			);
		expect(linked({ reconciled: true, keptBackPapers: 0 })?.done).toBe(true);
		expect(linked({ reconciled: false, keptBackPapers: 0 })?.done).toBe(false);
		expect(linked({ reconciled: true, keptBackPapers: 2 })).toMatchObject({
			done: false,
			missing: 2
		});
	});

	test('nothing to check while the conference runs or after it', () => {
		expect(readinessChecks({ state: 'ACTIVE', facts, now })).toEqual([]);
		expect(readinessChecks({ state: 'POST', facts, now })).toEqual([]);
	});
});

describe('conferenceDays', () => {
	test('every day from start to end', () => {
		expect(conferenceDays({ start: '2027-01-14T00:00:00Z', end: '2027-01-16T00:00:00Z' })).toEqual([
			'2027-01-14',
			'2027-01-15',
			'2027-01-16'
		]);
	});
});
