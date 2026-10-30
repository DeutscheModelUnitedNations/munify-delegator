import type { ConferencestateEnum } from '#lib/api/rumbleClient/client';
import type { WaitingListStatus } from '#lib/helpers/waitingListStatus';
import { m } from '#lib/paraglide/messages';

export type RegistrationStatus = 'OPEN' | 'CLOSED' | 'WAITING_LIST' | 'NOT_YET_OPEN' | 'UNKNOWN';

/**
 * The registration status participants are shown. It closes at the advertised deadline
 * (`applicationDeadline`) on purpose: the API keeps taking applications for the grace period after it
 * (`acceptsApplications` in `#lib/helpers/applicationReadiness`), as a buffer nobody is told about.
 */
export const getRegistrationStatus = (
	conferenceState: ConferencestateEnum,
	applicationDeadline: Date
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
		new Date().getTime() > applicationDeadline.getTime()
	) {
		return 'CLOSED';
	}

	if (
		conferenceState === 'PARTICIPANT_REGISTRATION' &&
		new Date().getTime() <= applicationDeadline.getTime()
	) {
		return 'OPEN';
	}

	return 'UNKNOWN';
};

export interface StatusLightConfig {
	color: 'success' | 'warning' | 'error' | 'info';
	blink: boolean;
	tooltip?: string;
}

/** How the status light shows a registration status; the waiting list tells how long it is. */
export function registrationStatusLight(
	registrationStatus: RegistrationStatus,
	waitingListStatus: WaitingListStatus
): StatusLightConfig {
	if (registrationStatus === 'OPEN') return { color: 'success', blink: true };
	if (registrationStatus !== 'WAITING_LIST') {
		return { color: 'error', blink: false, tooltip: m.registrationClosed() };
	}
	return waitingListLight[waitingListStatus]();
}

const waitingListLight: Record<WaitingListStatus, () => StatusLightConfig> = {
	VACANCIES: () => ({ color: 'warning', blink: true, tooltip: m.vacancies() }),
	LONG_LIST: () => ({ color: 'warning', blink: false, tooltip: m.longWaitingList() }),
	SHORT_LIST: () => ({ color: 'warning', blink: false, tooltip: m.shortWaitingList() })
};
