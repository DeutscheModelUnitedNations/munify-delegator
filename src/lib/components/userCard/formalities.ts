import type {
	AdministrativestatusEnum,
	MediaconsentstatusEnum
} from '#lib/api/rumbleClient/client';
import { ofAgeAtConference } from '#lib/helpers/ageChecker';

/** The statuses of a `conferenceParticipant` row that have to be settled before the conference. */
export interface FormalityStatuses {
	paymentStatus: AdministrativestatusEnum;
	termsAndConditions: AdministrativestatusEnum;
	guardianConsent: AdministrativestatusEnum;
	mediaConsent: AdministrativestatusEnum;
	mediaConsentStatus: MediaconsentstatusEnum;
}

export type FormalityKey = keyof FormalityStatuses;

export interface Formality {
	key: FormalityKey;
	state: 'done' | 'pending' | 'problem';
}

const STATE: Record<AdministrativestatusEnum, Formality['state']> = {
	DONE: 'done',
	PENDING: 'pending',
	PROBLEM: 'problem'
};

/**
 * What has to be settled for the person, in the order the card lists it. Without a row yet
 * everything is pending. What the consent allows (`mediaConsentStatus`) is read off the signed
 * paper, so it only counts as open once that has arrived.
 */
export function formalitiesOf({
	status,
	needsGuardian
}: {
	status: FormalityStatuses | undefined;
	/** See `needsGuardian` */
	needsGuardian: boolean;
}): Formality[] {
	const administrative = (key: Exclude<FormalityKey, 'mediaConsentStatus'>): Formality => ({
		key,
		state: STATE[status?.[key] ?? 'PENDING']
	});
	const mediaConsent = administrative('mediaConsent');
	const photosOpen =
		mediaConsent.state === 'done' && (status?.mediaConsentStatus ?? 'NOT_SET') === 'NOT_SET';
	return [
		administrative('paymentStatus'),
		administrative('termsAndConditions'),
		...(needsGuardian ? [administrative('guardianConsent')] : []),
		mediaConsent,
		{ key: 'mediaConsentStatus', state: photosOpen ? 'pending' : 'done' }
	];
}

/** Whether a guardian has to consent: adults at the conference and supervisors sign for themselves. */
export const needsGuardian = ({
	isConferenceSupervisor,
	birthday,
	startConference
}: {
	isConferenceSupervisor: boolean;
	birthday: Date | null | undefined;
	startConference: Date | null | undefined;
}) => !isConferenceSupervisor && !ofAgeAtConference({ startConference, dateOfBirth: birthday });

/** Whether a formality still needs somebody to do something. */
export const isOpen = (formality: Formality) => formality.state !== 'done';

/**
 * What the team does with a person at this point, which the overview leads with: judging the
 * application until they have a seat, settling the formalities until the conference runs, then
 * letting them in. Nothing for somebody who has none of it, like the team.
 */
export function overviewLead({
	state,
	access,
	participant,
	applicant
}: {
	state: 'PRE' | 'PARTICIPANT_REGISTRATION' | 'PREPARATION' | 'ACTIVE' | 'POST';
	/** A confirmed place at the conference */
	access: boolean;
	/** The person has a `conferenceParticipant` row */
	participant: boolean;
	/** A delegation, a single participation, or a place on the waiting list */
	applicant: boolean;
}): 'application' | 'formalities' | 'onSite' | undefined {
	if (access && participant) {
		return state === 'ACTIVE' || state === 'POST' ? 'onSite' : 'formalities';
	}
	return applicant ? 'application' : undefined;
}
