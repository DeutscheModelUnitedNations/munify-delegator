import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('#lib/paraglide/messages', () => ({
	m: {
		registrationClosed: () => 'closed',
		vacancies: () => 'vacancies',
		longWaitingList: () => 'long list',
		shortWaitingList: () => 'short list'
	}
}));

import type { RegistrationStatus } from './registrationStatus';

const { getRegistrationStatus, registrationStatusLight } = await import('./registrationStatus');

const now = new Date('2026-03-01T12:00:00Z');
const later = new Date('2026-04-01T12:00:00Z');
const earlier = new Date('2026-02-01T12:00:00Z');

describe('getRegistrationStatus', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(now);
	});
	afterEach(() => vi.useRealTimers());

	test('is not yet open before the registration', () => {
		expect(getRegistrationStatus({ conferenceState: 'PRE', applicationDeadline: later })).toBe(
			'NOT_YET_OPEN'
		);
	});

	test('is open during the registration until the deadline', () => {
		expect(
			getRegistrationStatus({
				conferenceState: 'PARTICIPANT_REGISTRATION',
				applicationDeadline: later
			})
		).toBe('OPEN');
		expect(
			getRegistrationStatus({
				conferenceState: 'PARTICIPANT_REGISTRATION',
				applicationDeadline: now
			})
		).toBe('OPEN');
	});

	test('closes at the advertised deadline, grace period or not', () => {
		expect(
			getRegistrationStatus({
				conferenceState: 'PARTICIPANT_REGISTRATION',
				applicationDeadline: earlier
			})
		).toBe('CLOSED');
	});

	test('sends people to the waiting list during the preparation', () => {
		expect(
			getRegistrationStatus({ conferenceState: 'PREPARATION', applicationDeadline: earlier })
		).toBe('WAITING_LIST');
		expect(
			getRegistrationStatus({ conferenceState: 'PREPARATION', applicationDeadline: later })
		).toBe('WAITING_LIST');
	});

	test('is closed once the conference runs or is over', () => {
		expect(getRegistrationStatus({ conferenceState: 'ACTIVE', applicationDeadline: later })).toBe(
			'CLOSED'
		);
		expect(getRegistrationStatus({ conferenceState: 'POST', applicationDeadline: later })).toBe(
			'CLOSED'
		);
	});
});

describe('registrationStatusLight', () => {
	test('blinks green while the registration is open', () => {
		expect(
			registrationStatusLight({ registrationStatus: 'OPEN', waitingListStatus: 'LONG_LIST' })
		).toEqual({
			color: 'success',
			blink: true
		});
	});

	test('shows red for every status without a way in', () => {
		const closed: RegistrationStatus[] = ['CLOSED', 'NOT_YET_OPEN', 'UNKNOWN'];
		for (const status of closed) {
			expect(
				registrationStatusLight({ registrationStatus: status, waitingListStatus: 'VACANCIES' })
			).toEqual({
				color: 'error',
				blink: false,
				tooltip: 'closed'
			});
		}
	});

	test('tells how long the waiting list is, blinking while seats are free', () => {
		expect(
			registrationStatusLight({
				registrationStatus: 'WAITING_LIST',
				waitingListStatus: 'VACANCIES'
			})
		).toEqual({
			color: 'warning',
			blink: true,
			tooltip: 'vacancies'
		});
		expect(
			registrationStatusLight({
				registrationStatus: 'WAITING_LIST',
				waitingListStatus: 'LONG_LIST'
			})
		).toEqual({
			color: 'warning',
			blink: false,
			tooltip: 'long list'
		});
		expect(
			registrationStatusLight({
				registrationStatus: 'WAITING_LIST',
				waitingListStatus: 'SHORT_LIST'
			})
		).toEqual({
			color: 'warning',
			blink: false,
			tooltip: 'short list'
		});
	});
});
