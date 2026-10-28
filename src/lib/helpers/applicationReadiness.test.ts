import { describe, expect, test } from 'vitest';
import {
	acceptsApplications,
	applicationTextsComplete,
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
		expect(acceptsApplications(open, new Date('2026-03-01T12:30:00Z'))).toBe(true);
		expect(acceptsApplications(open, new Date('2026-03-01T12:30:01Z'))).toBe(false);
		expect(
			acceptsApplications({ ...open, state: 'PREPARATION' }, new Date('2026-02-01T00:00:00Z'))
		).toBe(false);
	});
});
