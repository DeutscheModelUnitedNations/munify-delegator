import type { AdministrativeStatus, ParticipantRow } from './types';
import { getAgeAtConference, ofAgeAtConference } from '#lib/helpers/ageChecker';
import type { ConferenceParticipants } from './conferenceParticipants';
import { splitRole } from '#lib/helpers/conferenceRole';

type Registrations = Omit<ConferenceParticipants, 'conference'>;

/** The rows of each registration list; the live query's subscription surface is not needed. */
export type QueryData = {
	[K in keyof Registrations]: ReadonlyArray<Registrations[K][number]>;
};

function computePostalRegistrationStatus({
	status,
	startConference,
	birthday
}: {
	status: {
		termsAndConditions: string;
		mediaConsent: string;
		guardianConsent: string;
		paymentStatus: string;
	};
	startConference: Date | string | undefined;
	birthday: Date | string | null;
}): AdministrativeStatus {
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
		(status.guardianConsent === 'DONE' ||
			ofAgeAtConference({ startConference, dateOfBirth: birthday }))
	) {
		return 'DONE';
	}
	return 'PENDING';
}

function hasBirthdayDuring({
	birthday,
	startConference,
	endConference
}: {
	birthday: Date | null;
	startConference: Date | string | undefined;
	endConference: Date | string | undefined;
}): boolean {
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
type WaitingListEntry = QueryData['waitingListEntries'][number];

/** The waiting list columns of a person's row, from their entry if they have one. */
function waitingListFields(entry: WaitingListEntry | undefined) {
	return {
		onWaitingList: !!entry && !entry.assignedAt,
		waitingListSince: entry ? new Date(entry.createdAt) : null,
		seatedFromWaitingListAt: entry?.assignedAt ? new Date(entry.assignedAt) : null
	} satisfies Partial<ParticipantRow>;
}

/** The registration-specific part of a row; everything else comes from the user and status. */
type RoleFields = Pick<
	ParticipantRow,
	| 'role'
	| 'nationAlpha2Code'
	| 'nationAlpha3Code'
	| 'nsaName'
	| 'nsaIcon'
	| 'committee'
	| 'school'
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
	school: null,
	isHeadDelegate: null,
	assignedRoleName: null,
	assignedRoleIcon: null,
	teamRole: null,
	plansOwnAttendance: null
} satisfies Omit<RoleFields, 'role' | 'accepted'>;

/** The columns that come straight from the user row. */
function userFields({ user, birthday }: { user: ParticipantUser; birthday: Date | null }) {
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
function statusFields({
	status,
	startConference,
	birthday
}: {
	status: ParticipantStatus | undefined;
	startConference: Date | string | undefined;
	birthday: Date | null;
}) {
	return {
		paymentStatus: status?.paymentStatus ?? 'PENDING',
		postalRegistrationStatus: status
			? computePostalRegistrationStatus({ status, startConference, birthday })
			: 'PENDING',
		termsAndConditions: status?.termsAndConditions ?? 'PENDING',
		guardianConsent: status?.guardianConsent ?? 'PENDING',
		mediaConsent: status?.mediaConsent ?? 'PENDING',
		didAttend: status?.didAttend ?? null,
		documentNumber: status?.assignedDocumentNumber ?? null,
		accessCardId: status?.accessCardId ?? null
	} satisfies Partial<ParticipantRow>;
}

/** An accepted participant (not a team member) whose payment or paperwork is not complete. */
function hasOpenIssue({
	roleFields,
	status
}: {
	roleFields: RoleFields;
	status: ReturnType<typeof statusFields>;
}): boolean {
	if (!roleFields.accepted || roleFields.role === 'TEAM_MEMBER') return false;
	return status.paymentStatus !== 'DONE' || status.postalRegistrationStatus !== 'DONE';
}

function buildRow({
	user,
	status,
	waiting,
	roleFields,
	startConference,
	endConference
}: {
	user: ParticipantUser;
	status: ParticipantStatus | undefined;
	waiting: WaitingListEntry | undefined;
	roleFields: RoleFields;
	startConference: Date | string | undefined;
	endConference: Date | string | undefined;
}): ParticipantRow {
	const birthday = user.birthday ? new Date(user.birthday) : null;
	const statuses = statusFields({ status, startConference, birthday });
	return {
		...userFields({ user, birthday }),
		...roleFields,
		...statuses,
		...waitingListFields(waiting),
		hasOpenIssue: hasOpenIssue({ roleFields, status: statuses }),
		ageAtConference:
			birthday && startConference
				? (getAgeAtConference({ birthday, startConference }) ?? null)
				: null,
		hasBirthdayDuringConference: hasBirthdayDuring({ birthday, startConference, endConference })
	};
}

export function transformParticipants({
	queryData,
	startConference,
	endConference
}: {
	queryData: QueryData;
	startConference: Date | string | undefined;
	endConference: Date | string | undefined;
}): ParticipantRow[] {
	const statusMap = new Map<string, ParticipantStatus>();
	for (const s of queryData.participantStatuses) {
		statusMap.set(s.user.id, s);
	}

	const waitingMap = new Map(queryData.waitingListEntries.map((entry) => [entry.user.id, entry]));

	const row = ({ user, roleFields }: { user: ParticipantUser; roleFields: RoleFields }) =>
		buildRow({
			user,
			status: statusMap.get(user.id),
			waiting: waitingMap.get(user.id),
			roleFields,
			startConference,
			endConference
		});

	const registered = [
		...queryData.delegationMembers.map((entry) => {
			const { nation, nonStateActor } = splitRole(entry.delegation.assignedRole);
			return row({
				user: entry.user,
				roleFields: {
					...noRoleFields,
					role: 'DELEGATION_MEMBER',
					nationAlpha2Code: nation?.alpha2Code ?? null,
					nationAlpha3Code: nation?.alpha3Code ?? null,
					nsaName: nonStateActor?.name ?? null,
					nsaIcon: nonStateActor?.fontAwesomeIcon ?? null,
					committee: entry.assignedCommittee?.name ?? null,
					school: entry.school?.name ?? null,
					isHeadDelegate: entry.isHeadDelegate,
					accepted: !!entry.delegation.assignedRole
				}
			});
		}),
		...queryData.conferenceSupervisors.map((entry) =>
			row({
				user: entry.user,
				roleFields: {
					...noRoleFields,
					role: 'SUPERVISOR',
					school: entry.school?.name ?? null,
					plansOwnAttendance: entry.plansOwnAttendenceAtConference,
					accepted:
						entry.supervisedDelegationMembers.some((dm) => !!dm.delegation.assignedRoleId) ||
						entry.supervisedSingleParticipants.some((sp) => !!sp.assignedRole)
				}
			})
		),
		...queryData.singleParticipants.map((entry) =>
			row({
				user: entry.user,
				roleFields: {
					...noRoleFields,
					role: 'SINGLE_PARTICIPANT',
					school: entry.school?.name ?? null,
					assignedRoleName: entry.assignedRole?.name ?? null,
					assignedRoleIcon: entry.assignedRole?.fontAwesomeIcon ?? null,
					accepted: !!entry.assignedRole
				}
			})
		),
		...queryData.teamMembers.map((entry) =>
			row({
				user: entry.user,
				roleFields: {
					...noRoleFields,
					role: 'TEAM_MEMBER',
					teamRole: entry.role,
					accepted: true
				}
			})
		)
	];

	// People still waiting who hold no registration here are rows of their own.
	const registeredUsers = new Set(registered.map((entry) => entry.userId));
	const waiting = queryData.waitingListEntries
		.filter((entry) => !entry.assignedAt && !registeredUsers.has(entry.user.id))
		.map((entry) =>
			row({
				user: entry.user,
				roleFields: {
					...noRoleFields,
					role: 'WAITING_LIST',
					school: entry.school?.name ?? null,
					accepted: false
				}
			})
		);

	return [...registered, ...waiting];
}
