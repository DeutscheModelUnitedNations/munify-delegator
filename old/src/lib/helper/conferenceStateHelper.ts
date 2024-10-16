import type { Conference } from '@prisma/client';

/**
 * @param conference The conference to check
 * @returns True if the conference has ended (the end date is in the past)
 */
export function hasConferenceEnded(conference: Pick<Conference, 'endConference'>) {
	const now = new Date();
	const end = new Date(conference.endConference);
	return now > end;
}
