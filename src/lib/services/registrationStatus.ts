import type { ConferenceState$options } from '$houdini';

export type RegistrationStatus = 'OPEN' | 'CLOSED' | 'WAITING_LIST' | 'NOT_YET_OPEN' | 'UNKNOWN';

export const getRegistrationStatus = (
	conferenceState: ConferenceState$options,
	startAssignment: Date
): RegistrationStatus => {
	if (conferenceState === 'PRE') {
		return 'NOT_YET_OPEN';
	}

	if (conferenceState === 'PREPARATION') {
		return 'WAITING_LIST';
	}

	if (
		conferenceState === 'ACTIVE' ||
		conferenceState === 'POST' ||
		new Date().getTime() > startAssignment.getTime()
	) {
		return 'CLOSED';
	}

	if (
		conferenceState === 'PARTICIPANT_REGISTRATION' &&
		new Date().getTime() <= startAssignment.getTime()
	) {
		return 'OPEN';
	}

	return 'UNKNOWN';
};

/**
 * The technical registration deadline: the public deadline (startAssignment) plus the grace period
 * during which the backend still accepts completed applications.
 */
export const getTechnicalRegistrationDeadline = (
	startAssignment: Date,
	registrationDeadlineGracePeriodMinutes: number
): Date => new Date(startAssignment.getTime() + registrationDeadlineGracePeriodMinutes * 60_000);

/**
 * Whether the technical registration deadline has passed. Once it has, applications can no longer
 * be completed and the selection process is running until the conference moves on to PREPARATION.
 */
export const isRegistrationDeadlinePassed = (
	startAssignment: Date,
	registrationDeadlineGracePeriodMinutes: number,
	now: Date = new Date()
): boolean =>
	now.getTime() >
	getTechnicalRegistrationDeadline(
		startAssignment,
		registrationDeadlineGracePeriodMinutes
	).getTime();
