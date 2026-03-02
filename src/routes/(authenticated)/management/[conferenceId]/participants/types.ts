export type ParticipationRole =
	| 'SUPERVISOR'
	| 'SINGLE_PARTICIPANT'
	| 'DELEGATION_MEMBER'
	| 'TEAM_MEMBER';

export type AdministrativeStatus = 'DONE' | 'PENDING' | 'PROBLEM';

export type ColumnCategory = 'personal' | 'status' | 'role' | 'computed';

export type FilterType = 'text' | 'enum' | 'boolean' | 'range';

export type TextFilterMode =
	| 'contains'
	| 'containsNot'
	| 'equals'
	| 'equalsNot'
	| 'startsWith'
	| 'startsWithNot'
	| 'isEmpty'
	| 'isNotEmpty';

export interface ColumnMeta {
	category: ColumnCategory;
	description: string;
	defaultVisible: boolean;
	filterType: FilterType;
}

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
	mediaConsentStatus: string | null;
	didAttend: boolean | null;
	documentNumber: number | null;
	accessCardId: string | null;

	accepted: boolean;
	ageAtConference: number | null;
	hasBirthdayDuringConference: boolean;
	participationCount: number;
}
