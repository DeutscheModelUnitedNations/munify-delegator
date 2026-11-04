import type { ColumnMeta } from '../columnTypes';

/**
 * The participants table's columns as the API and the page share them: id, type and the values of
 * an enum. The page adds labels and cells (`team/participants/columns.ts`), the API how each is
 * computed (`#api/handlers/dataTable/sources/participants`).
 */
const GENDERS = ['MALE', 'FEMALE', 'DIVERSE', 'NO_STATEMENT'] as const;
const FOOD_PREFERENCES = ['OMNIVORE', 'VEGETARIAN', 'VEGAN'] as const;
const PARTICIPATION_ROLES = [
	'DELEGATION_MEMBER',
	'SINGLE_PARTICIPANT',
	'SUPERVISOR',
	'TEAM_MEMBER',
	'WAITING_LIST'
] as const;
export const TEAM_ROLES = [
	'PROJECT_MANAGEMENT',
	'PARTICIPANT_CARE',
	'TEAM_COORDINATOR',
	'CONTENT_LEAD',
	'REVIEWER',
	'MEMBER'
] as const;
const ADMINISTRATIVE_STATUSES = ['DONE', 'PENDING', 'PROBLEM'] as const;

export const PARTICIPANTS_COLUMNS = [
	{ id: 'userId', type: 'text' },
	{ id: 'family_name', type: 'text' },
	{ id: 'given_name', type: 'text' },
	{ id: 'email', type: 'text' },
	{ id: 'phone', type: 'text' },
	{ id: 'birthday', type: 'date' },
	{ id: 'ageAtConference', type: 'number' },
	{ id: 'hasBirthdayDuringConference', type: 'boolean' },
	{ id: 'gender', type: 'enum', options: GENDERS },
	{ id: 'pronouns', type: 'text' },
	{ id: 'foodPreference', type: 'enum', options: FOOD_PREFERENCES },
	{ id: 'city', type: 'text' },
	{ id: 'country', type: 'text' },
	{ id: 'role', type: 'enum', options: PARTICIPATION_ROLES },
	// a nation's alpha-3 code or a non-state actor's name; the page knows the conference's roles
	{ id: 'nation', type: 'enum' },
	{ id: 'committee', type: 'text' },
	{ id: 'school', type: 'text' },
	{ id: 'isHeadDelegate', type: 'boolean' },
	{ id: 'assignedRoleName', type: 'text' },
	{ id: 'teamRole', type: 'enum', options: TEAM_ROLES },
	{ id: 'onWaitingList', type: 'boolean' },
	{ id: 'waitingListSince', type: 'date' },
	{ id: 'seatedFromWaitingListAt', type: 'date' },
	{ id: 'plansOwnAttendance', type: 'boolean' },
	{ id: 'paymentStatus', type: 'enum', options: ADMINISTRATIVE_STATUSES },
	{ id: 'postalRegistrationStatus', type: 'enum', options: ADMINISTRATIVE_STATUSES },
	{ id: 'didAttend', type: 'boolean' },
	{ id: 'termsAndConditions', type: 'enum', options: ADMINISTRATIVE_STATUSES },
	{ id: 'guardianConsent', type: 'enum', options: ADMINISTRATIVE_STATUSES },
	{ id: 'mediaConsent', type: 'enum', options: ADMINISTRATIVE_STATUSES },
	{ id: 'documentNumber', type: 'text' },
	{ id: 'accessCardId', type: 'text' },
	{ id: 'accepted', type: 'boolean' },
	{ id: 'hasOpenIssue', type: 'boolean' },
	{ id: 'participationCount', type: 'number' }
] as const satisfies readonly ColumnMeta[];
