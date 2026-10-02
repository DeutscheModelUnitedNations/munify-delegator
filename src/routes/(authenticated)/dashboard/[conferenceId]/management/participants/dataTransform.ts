import type { AdministrativeStatus, ParticipantRow } from './types';
import { getAgeAtConference, ofAgeAtConference } from '$lib/helpers/ageChecker';
import type { ConferenceParticipants } from './conferenceParticipants';

type Registrations = Omit<ConferenceParticipants, 'conference'>;

/** The rows of each registration list; the live query's subscription surface is not needed. */
export type QueryData = {
	[K in keyof Registrations]: ReadonlyArray<Registrations[K][number]>;
};

function computePostalRegistrationStatus(
	status: {
		termsAndConditions: string;
		mediaConsent: string;
		guardianConsent: string;
		paymentStatus: string;
	},
	startConference: Date | string | undefined,
	birthday: Date | string | null
): AdministrativeStatus {
	if (
		status.termsAndConditions === 'PROBLEM' ||
		status.mediaConsent === 'PROBLEM' ||
		status.guardianConsent === 'PROBLEM'
	) {
		return 'PROBLEM';
	}
	if (
		status.termsAndConditions === 'DONE' &&
		status.mediaConsent === 'DONE' &&
		(status.guardianConsent === 'DONE' || ofAgeAtConference(startConference, birthday))
	) {
		return 'DONE';
	}
	return 'PENDING';
}

function hasBirthdayDuring(
	birthday: Date | null,
	startConference: Date | string | undefined,
	endConference: Date | string | undefined
): boolean {
	if (!birthday || !startConference || !endConference) return false;
	const start = typeof startConference === 'string' ? new Date(startConference) : startConference;
	const end = typeof endConference === 'string' ? new Date(endConference) : endConference;

	// Check the conference year(s) for a birthday match
	const years = new Set([start.getFullYear(), end.getFullYear()]);
	for (const year of years) {
		const bdayInYear = new Date(year, birthday.getMonth(), birthday.getDate());
		if (bdayInYear >= start && bdayInYear <= end) return true;
	}
	return false;
}

type ParticipantUser = QueryData['delegationMembers'][number]['user'];
type ParticipantStatus = QueryData['participantStatuses'][number];

/** The registration-specific part of a row; everything else comes from the user and status. */
type RoleFields = Pick<
	ParticipantRow,
	| 'role'
	| 'nationAlpha2Code'
	| 'nationAlpha3Code'
	| 'nsaName'
	| 'nsaIcon'
	| 'committee'
	| 'delegationSchool'
	| 'isHeadDelegate'
	| 'assignedRoleName'
	| 'assignedRoleIcon'
	| 'teamRole'
	| 'plansOwnAttendance'
	| 'accepted'
>;

const noRoleFields = {
	nationAlpha2Code: null,
	nationAlpha3Code: null,
	nsaName: null,
	nsaIcon: null,
	committee: null,
	delegationSchool: null,
	isHeadDelegate: null,
	assignedRoleName: null,
	assignedRoleIcon: null,
	teamRole: null,
	plansOwnAttendance: null
} satisfies Omit<RoleFields, 'role' | 'accepted'>;

/** The columns that come straight from the user row. */
function userFields(user: ParticipantUser, birthday: Date | null) {
	return {
		userId: user.id,
		given_name: user.givenName,
		family_name: user.familyName,
		email: user.email,
		phone: user.phone ?? null,
		birthday,
		gender: user.gender ?? null,
		pronouns: user.pronouns ?? null,
		foodPreference: user.foodPreference ?? null,
		city: user.city ?? null,
		country: user.country ?? null,
		participationCount: user.conferenceParticipationsCount ?? 0
	} satisfies Partial<ParticipantRow>;
}

/** The administrative columns; a participant without a status row is pending everywhere. */
function statusFields(
	status: ParticipantStatus | undefined,
	startConference: Date | string | undefined,
	birthday: Date | null
) {
	return {
		paymentStatus: status?.paymentStatus ?? 'PENDING',
		postalRegistrationStatus: status
			? computePostalRegistrationStatus(status, startConference, birthday)
			: 'PENDING',
		termsAndConditions: status?.termsAndConditions ?? 'PENDING',
		guardianConsent: status?.guardianConsent ?? 'PENDING',
		mediaConsent: status?.mediaConsent ?? 'PENDING',
		didAttend: status?.didAttend ?? null,
		documentNumber: status?.assignedDocumentNumber ?? null,
		accessCardId: status?.accessCardId ?? null
	} satisfies Partial<ParticipantRow>;
}

function buildRow(
	user: ParticipantUser,
	status: ParticipantStatus | undefined,
	roleFields: RoleFields,
	startConference: Date | string | undefined,
	endConference: Date | string | undefined
): ParticipantRow {
	const birthday = user.birthday ? new Date(user.birthday) : null;
	return {
		...userFields(user, birthday),
		...roleFields,
		...statusFields(status, startConference, birthday),
		ageAtConference:
			birthday && startConference ? (getAgeAtConference(birthday, startConference) ?? null) : null,
		hasBirthdayDuringConference: hasBirthdayDuring(birthday, startConference, endConference)
	};
}

export function transformParticipants(
	queryData: QueryData,
	startConference: Date | string | undefined,
	endConference: Date | string | undefined
): ParticipantRow[] {
	const statusMap = new Map<string, ParticipantStatus>();
	for (const s of queryData.participantStatuses) {
		statusMap.set(s.user.id, s);
	}

	const row = (user: ParticipantUser, roleFields: RoleFields) =>
		buildRow(user, statusMap.get(user.id), roleFields, startConference, endConference);

	return [
		...queryData.delegationMembers.map((entry) =>
			row(entry.user, {
				...noRoleFields,
				role: 'DELEGATION_MEMBER',
				nationAlpha2Code: entry.delegation.assignedNation?.alpha2Code ?? null,
				nationAlpha3Code: entry.delegation.assignedNation?.alpha3Code ?? null,
				nsaName: entry.delegation.assignedNonStateActor?.name ?? null,
				nsaIcon: entry.delegation.assignedNonStateActor?.fontAwesomeIcon ?? null,
				committee: entry.assignedCommittee?.name ?? null,
				delegationSchool: entry.delegation.school ?? null,
				isHeadDelegate: entry.isHeadDelegate,
				accepted: !!entry.delegation.assignedNation || !!entry.delegation.assignedNonStateActor
			})
		),
		...queryData.conferenceSupervisors.map((entry) =>
			row(entry.user, {
				...noRoleFields,
				role: 'SUPERVISOR',
				plansOwnAttendance: entry.plansOwnAttendenceAtConference,
				accepted:
					entry.supervisedDelegationMembers.some(
						(dm) => !!dm.delegation.assignedNation || !!dm.delegation.assignedNonStateActor
					) || entry.supervisedSingleParticipants.some((sp) => !!sp.assignedRole)
			})
		),
		...queryData.singleParticipants.map((entry) =>
			row(entry.user, {
				...noRoleFields,
				role: 'SINGLE_PARTICIPANT',
				delegationSchool: entry.school ?? null,
				assignedRoleName: entry.assignedRole?.name ?? null,
				assignedRoleIcon: entry.assignedRole?.fontAwesomeIcon ?? null,
				accepted: !!entry.assignedRole
			})
		),
		...queryData.teamMembers.map((entry) =>
			row(entry.user, {
				...noRoleFields,
				role: 'TEAM_MEMBER',
				teamRole: entry.role,
				accepted: true
			})
		)
	];
}
