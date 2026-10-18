import { describe, expect, it } from 'vitest';
import {
	getTechnicalRegistrationDeadline,
	isRegistrationDeadlinePassed
} from '$lib/services/registrationStatus';

const startAssignment = new Date('2026-03-12T09:00:00.000Z');

describe('getTechnicalRegistrationDeadline', () => {
	it('adds the grace period to the public deadline', () => {
		expect(getTechnicalRegistrationDeadline(startAssignment, 30)).toEqual(
			new Date('2026-03-12T09:30:00.000Z')
		);
	});

	it('equals the public deadline without a grace period', () => {
		expect(getTechnicalRegistrationDeadline(startAssignment, 0)).toEqual(startAssignment);
	});
});

describe('isRegistrationDeadlinePassed', () => {
	it('is not passed before the public deadline', () => {
		expect(
			isRegistrationDeadlinePassed(startAssignment, 30, new Date('2026-03-12T08:59:59.000Z'))
		).toBe(false);
	});

	it('is not passed during the grace period', () => {
		expect(
			isRegistrationDeadlinePassed(startAssignment, 30, new Date('2026-03-12T09:15:00.000Z'))
		).toBe(false);
		expect(
			isRegistrationDeadlinePassed(startAssignment, 30, new Date('2026-03-12T09:30:00.000Z'))
		).toBe(false);
	});

	it('is passed once the grace period is over', () => {
		expect(
			isRegistrationDeadlinePassed(startAssignment, 30, new Date('2026-03-12T09:30:01.000Z'))
		).toBe(true);
		expect(
			isRegistrationDeadlinePassed(startAssignment, 0, new Date('2026-03-12T09:00:01.000Z'))
		).toBe(true);
	});
});
