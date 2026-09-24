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
