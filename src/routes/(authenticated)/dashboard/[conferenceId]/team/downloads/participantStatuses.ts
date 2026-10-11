import { client } from '$lib/api/rumbleClient/client';

/**
 * Every participant status of one conference, keyed by the user it belongs to. The registration
 * lists and the status export both join their rows against this.
 */
export async function fetchParticipantStatusesByUser(conferenceId: string) {
	const statuses = await client.query.conferenceParticipantStatuses({
		__args: { where: { conferenceId: { eq: conferenceId } } },
		id: true,
		userId: true,
		termsAndConditions: true,
		guardianConsent: true,
		mediaConsent: true,
		mediaConsentStatus: true,
		paymentStatus: true,
		didAttend: true
	});
	return new Map(statuses.map((status) => [status.userId, status]));
}

/** When the conference starts, which decides who counts as of age. */
export async function fetchConferenceStart(conferenceId: string) {
	const conference = await client.query.conference({
		__args: { id: conferenceId },
		id: true,
		startConference: true
	});
	return conference.startConference;
}
