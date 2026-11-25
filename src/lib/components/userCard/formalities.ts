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

/**
 * Whether what the consent allows is shown: once a paper has come in that says it, or somebody has set
 * it all the same.
 */
export const photoStatusShown = ({
	mediaConsent,
	mediaConsentStatus
}: Pick<FormalityStatuses, 'mediaConsent' | 'mediaConsentStatus'>) =>
	mediaConsent !== 'PENDING' || mediaConsentStatus !== 'NOT_SET';

/** How many of the signed papers are settled; the photo consent is one with what it allows. */
export function postalProgress(formalities: readonly Formality[]) {
	const papers = formalities.filter(
		({ key }) => key !== 'paymentStatus' && key !== 'mediaConsentStatus'
	);
	const photosOpen = formalities.some(
		(formality) => formality.key === 'mediaConsentStatus' && isOpen(formality)
	);
	const open = papers.filter(
		(formality) => isOpen(formality) || (formality.key === 'mediaConsent' && photosOpen)
	);
	return { done: papers.length - open.length, total: papers.length };
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
