import type { ConferencestateEnum } from '$lib/api/rumbleClient/client';
import { getRegistrationStatus } from '$lib/utils/registrationStatus';
import { getWaitingListStatus } from '$lib/helpers/waitingListStatus';

/** The fields of a conference that decide whether, and how, people can still register. */
export interface ConferenceRegistrationFields {
	state: ConferencestateEnum;
	startAssignment: Date;
	totalSeats: number;
	totalParticipants: number;
	waitingListLength: number;
}

/** Whether a conference takes registrations, and how full its waiting list is. */
export function getConferenceRegistrationStatus(conference: ConferenceRegistrationFields) {
	return {
		registrationStatus: getRegistrationStatus(
			conference.state,
			new Date(conference.startAssignment)
		),
		waitingListStatus: getWaitingListStatus(
			conference.totalSeats,
			conference.totalParticipants,
			conference.waitingListLength
		)
	};
}
