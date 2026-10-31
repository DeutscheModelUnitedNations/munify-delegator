import { describe, expect, test } from 'vitest';
import {
	acceptsApplications,
	applicationTextsComplete,
	selectionInProgress,
	technicalRegistrationDeadline
} from './applicationReadiness';

const applicationDeadline = new Date('2026-03-01T12:00:00Z');
const open = {
	state: 'PARTICIPANT_REGISTRATION' as const,
	applicationDeadline,
	registrationDeadlineGracePeriodMinutes: 30
};

describe('applicationTextsComplete', () => {
	test('needs motivation and experience, but no school', () => {
		expect(applicationTextsComplete({ motivation: 'b', experience: 'c' })).toBe(true);
		expect(applicationTextsComplete({ motivation: '', experience: 'c' })).toBe(false);
		expect(applicationTextsComplete({ motivation: 'b', experience: null })).toBe(false);
	});
});

describe('acceptsApplications', () => {
	test('adds the grace period to the advertised deadline', () => {
		expect(technicalRegistrationDeadline(open)).toEqual(new Date('2026-03-01T12:30:00Z'));
	});

	test('accepts until the end of the grace period, and only during registration', () => {
		expect(acceptsApplications({ conference: open, now: Date.parse('2026-03-01T12:30:00Z') })).toBe(
			true
		);
		expect(acceptsApplications({ conference: open, now: Date.parse('2026-03-01T12:30:01Z') })).toBe(
			false
		);
		expect(
			acceptsApplications({
				conference: { ...open, state: 'PREPARATION' },
				now: Date.parse('2026-02-01T00:00:00Z')
			})
		).toBe(false);
	});
});

describe('selectionInProgress', () => {
	test('runs from the end of the grace period until registration closes', () => {
		expect(selectionInProgress({ conference: open, now: Date.parse('2026-03-01T12:15:00Z') })).toBe(
			false
		);
		expect(selectionInProgress({ conference: open, now: Date.parse('2026-03-01T12:30:00Z') })).toBe(
			false
		);
		expect(selectionInProgress({ conference: open, now: Date.parse('2026-03-01T12:30:01Z') })).toBe(
			true
		);
		expect(
			selectionInProgress({
				conference: { ...open, state: 'PREPARATION' },
				now: Date.parse('2026-04-01T00:00:00Z')
			})
		).toBe(false);
	});

	test('starts at the advertised deadline without a grace period', () => {
		const noGrace = { ...open, registrationDeadlineGracePeriodMinutes: 0 };
		expect(
			selectionInProgress({ conference: noGrace, now: Date.parse('2026-03-01T12:00:00Z') })
		).toBe(false);
		expect(
			selectionInProgress({ conference: noGrace, now: Date.parse('2026-03-01T12:00:01Z') })
		).toBe(true);
	});
});
