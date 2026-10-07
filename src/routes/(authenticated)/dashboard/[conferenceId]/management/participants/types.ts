export type ParticipationRole =
	'SUPERVISOR' | 'SINGLE_PARTICIPANT' | 'DELEGATION_MEMBER' | 'TEAM_MEMBER';

export type AdministrativeStatus = 'DONE' | 'PENDING' | 'PROBLEM';

export interface ParticipantRow {
	userId: string;
	given_name: string;
	family_name: string;
	email: string | null;
	phone: string | null;
	birthday: Date | null;
	gender: string | null;
	pronouns: string | null;
	foodPreference: string | null;
	city: string | null;
	country: string | null;

	role: ParticipationRole;
	nationAlpha2Code: string | null;
	nationAlpha3Code: string | null;
	nsaName: string | null;
	nsaIcon: string | null;
	committee: string | null;
	delegationSchool: string | null;
	isHeadDelegate: boolean | null;
	assignedRoleName: string | null;
	assignedRoleIcon: string | null;
	teamRole: string | null;
	plansOwnAttendance: boolean | null;

	paymentStatus: AdministrativeStatus | null;
	postalRegistrationStatus: AdministrativeStatus | null;
	termsAndConditions: AdministrativeStatus | null;
	guardianConsent: AdministrativeStatus | null;
	mediaConsent: AdministrativeStatus | null;
	didAttend: boolean | null;
	documentNumber: number | null;
	accessCardId: string | null;

	accepted: boolean;
	/** Accepted and expected on site, but payment or a registration document is not DONE. */
	hasOpenIssue: boolean;
	ageAtConference: number | null;
	hasBirthdayDuringConference: boolean;
	participationCount: number;
}
