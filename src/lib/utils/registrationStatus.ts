import type { ConferencestateEnum } from '#lib/api/rumbleClient/client.js';

export type RegistrationStatus = 'OPEN' | 'CLOSED' | 'WAITING_LIST' | 'NOT_YET_OPEN' | 'UNKNOWN';

/**
 * The registration status participants are shown. It closes at the advertised deadline
 * (`startAssignment`) on purpose: the API keeps taking applications for the grace period after it
 * (`acceptsApplications` in `#lib/helpers/applicationReadiness.js`), as a buffer nobody is told about.
 */
export const getRegistrationStatus = (
	conferenceState: ConferencestateEnum,
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
