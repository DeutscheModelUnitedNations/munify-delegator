import type { AdministrativestatusEnum } from '$lib/api/rumbleClient/client';
import type { Row } from '$api/db/rows';

/**
 * Determines a simplified administrative status based on various consent statuses
 * @param participantStatus - Object containing participant's consent statuses
 * @param participantStatus.termsAndConditions - Status of terms and conditions acceptance
 * @param participantStatus.guardianConsent - Status of guardian consent
 * @param participantStatus.mediaConsent - Status of media consent
 * @param ofAge - Boolean indicating if participant is of legal age
 * @returns A simplified status: 'PROBLEM', 'PENDING', or 'DONE'
 */
export default function getSimplifiedPostalStatus(
	participantStatus:
		| (Pick<
				Row<'conferenceParticipantStatus'>,
				'termsAndConditions' | 'guardianConsent' | 'mediaConsent'
		  > & {
				[key: string]: unknown;
		  })
		| undefined
		| null,
	ofAge: boolean = false
) {
	const statuus: AdministrativestatusEnum[] = [];

	statuus.push(participantStatus?.termsAndConditions ?? 'PENDING');
	if (!ofAge) statuus.push(participantStatus?.guardianConsent ?? 'PENDING');
	statuus.push(participantStatus?.mediaConsent ?? 'PENDING');

	if (statuus.includes('PROBLEM')) {
		return 'PROBLEM';
	}
	if (statuus.includes('PENDING')) {
		return 'PENDING';
	}
	if (statuus.includes('DONE')) {
		return 'DONE';
	}
}
