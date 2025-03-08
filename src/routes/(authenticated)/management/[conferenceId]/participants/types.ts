import type { ConferenceParticipantStatus, User } from '@prisma/client';

export type ParticipationType = 'SUPERVISOR' | 'SINGLE_PARTICIPANT' | 'DELEGATION_MEMBER';
export type UserRowData = Pick<User, 'id' | 'given_name' | 'family_name' | 'city' | 'birthday'> & {
	participationType: ParticipationType;
	status:
		| Pick<
				ConferenceParticipantStatus,
				| 'didAttend'
				| 'guardianConsent'
				| 'paymentStatus'
				| 'mediaConsent'
				| 'termsAndConditions'
				| 'additionalNotes'
		  >
		| undefined;
};
