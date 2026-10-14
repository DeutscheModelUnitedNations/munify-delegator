import { client, type AdministrativestatusEnum } from '$lib/api/rumbleClient/client';

/** What a supervisor sees of a participant they supervise: contact details and paperwork status. */
export const supervisedUserSelection = {
	id: true,
	givenName: true,
	familyName: true,
	pronouns: true,
	email: true,
	birthday: true,
	conferenceParticipantStatus: {
		termsAndConditions: true,
		guardianConsent: true,
		mediaConsent: true,
		paymentStatus: true,
		conference: { id: true }
	}
} as const;

export interface SupervisedUser {
	id: string;
	givenName: string | null;
	familyName: string | null;
	pronouns: string | null;
	email: string;
	birthday: Date | null;
	conferenceParticipantStatus: {
		termsAndConditions: AdministrativestatusEnum;
		guardianConsent: AdministrativestatusEnum;
		mediaConsent: AdministrativestatusEnum;
		paymentStatus: AdministrativestatusEnum;
		conference: { id: string };
	}[];
}

/** Whether postal documents can be downloaded yet, and the start date that decides who is of age. */
export function fetchPostalConference(conferenceId: string) {
	return client.liveQuery.conference({
		__args: { id: conferenceId },
		startConference: true,
		unlockPostals: true
	});
}

export type PostalConference = Awaited<ReturnType<typeof fetchPostalConference>>;
