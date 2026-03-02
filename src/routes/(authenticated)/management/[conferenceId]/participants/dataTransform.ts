import type { AllConferenceParticipantsQuery$result } from '$houdini';
import type { AdministrativeStatus, ParticipantRow } from './types';
import { getAgeAtConference, ofAgeAtConference } from '$lib/services/ageChecker';

type QueryData = NonNullable<AllConferenceParticipantsQuery$result>;

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

export function transformParticipants(
	queryData: QueryData,
	startConference: Date | string | undefined
): ParticipantRow[] {
	const statusMap = new Map<string, QueryData['findManyConferenceParticipantStatuss'][number]>();
	for (const s of queryData.findManyConferenceParticipantStatuss) {
		statusMap.set(s.user.id, s);
	}

	const rows: ParticipantRow[] = [];

	for (const entry of queryData.findManyDelegationMembers) {
		const status = statusMap.get(entry.user.id);
		const birthday = entry.user.birthday ? new Date(entry.user.birthday) : null;
		const hasNation = !!entry.delegation?.assignedNation;
		const hasNsa = !!entry.delegation?.assignedNonStateActor;
		rows.push({
			userId: entry.user.id,
			given_name: entry.user.given_name,
			family_name: entry.user.family_name,
			email: entry.user.email,
			phone: entry.user.phone ?? null,
			birthday,
			gender: entry.user.gender ?? null,
			pronouns: entry.user.pronouns ?? null,
			foodPreference: entry.user.foodPreference ?? null,
			city: entry.user.city ?? null,
			country: entry.user.country ?? null,
			role: 'DELEGATION_MEMBER',
			nationAlpha2Code: entry.delegation?.assignedNation?.alpha2Code ?? null,
			nationAlpha3Code: entry.delegation?.assignedNation?.alpha3Code ?? null,
			nsaName: entry.delegation?.assignedNonStateActor?.name ?? null,
			nsaIcon: entry.delegation?.assignedNonStateActor?.fontAwesomeIcon ?? null,
			committee: entry.assignedCommittee?.name ?? null,
			delegationSchool: entry.delegation?.school ?? null,
			isHeadDelegate: entry.isHeadDelegate,
			assignedRoleName: null,
			assignedRoleIcon: null,
			teamRole: null,
			plansOwnAttendance: null,
			accepted: hasNation || hasNsa,
			paymentStatus: (status?.paymentStatus as AdministrativeStatus) ?? 'PENDING',
			postalRegistrationStatus: status
				? computePostalRegistrationStatus(status, startConference, birthday)
				: 'PENDING',
			termsAndConditions: (status?.termsAndConditions as AdministrativeStatus) ?? 'PENDING',
			guardianConsent: (status?.guardianConsent as AdministrativeStatus) ?? 'PENDING',
			mediaConsent: (status?.mediaConsent as AdministrativeStatus) ?? 'PENDING',
			mediaConsentStatus: status?.mediaConsentStatus ?? null,
			didAttend: status?.didAttend ?? null,
			documentNumber: status?.assignedDocumentNumber ?? null,
			accessCardId: status?.accessCardId ?? null,
			ageAtConference:
				birthday && startConference
					? (getAgeAtConference(birthday, startConference) ?? null)
					: null,
			participationCount: entry.user.conferenceParticipationsCount ?? 0
		});
	}

	for (const entry of queryData.findManyConferenceSupervisors) {
		const status = statusMap.get(entry.user.id);
		const birthday = entry.user.birthday ? new Date(entry.user.birthday) : null;
		const someParticipantAccepted =
			entry.supervisedDelegationMembers.some(
				(dm) => !!dm.delegation?.assignedNation || !!dm.delegation?.assignedNonStateActor
			) || entry.supervisedSingleParticipants.some((sp) => !!sp.assignedRole);
		rows.push({
			userId: entry.user.id,
			given_name: entry.user.given_name,
			family_name: entry.user.family_name,
			email: entry.user.email,
			phone: entry.user.phone ?? null,
			birthday,
			gender: entry.user.gender ?? null,
			pronouns: entry.user.pronouns ?? null,
			foodPreference: entry.user.foodPreference ?? null,
			city: entry.user.city ?? null,
			country: entry.user.country ?? null,
			role: 'SUPERVISOR',
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
			plansOwnAttendance: entry.plansOwnAttendenceAtConference,
			accepted: someParticipantAccepted,
			paymentStatus: (status?.paymentStatus as AdministrativeStatus) ?? 'PENDING',
			postalRegistrationStatus: status
				? computePostalRegistrationStatus(status, startConference, birthday)
				: 'PENDING',
			termsAndConditions: (status?.termsAndConditions as AdministrativeStatus) ?? 'PENDING',
			guardianConsent: (status?.guardianConsent as AdministrativeStatus) ?? 'PENDING',
			mediaConsent: (status?.mediaConsent as AdministrativeStatus) ?? 'PENDING',
			mediaConsentStatus: status?.mediaConsentStatus ?? null,
			didAttend: status?.didAttend ?? null,
			documentNumber: status?.assignedDocumentNumber ?? null,
			accessCardId: status?.accessCardId ?? null,
			ageAtConference:
				birthday && startConference
					? (getAgeAtConference(birthday, startConference) ?? null)
					: null,
			participationCount: entry.user.conferenceParticipationsCount ?? 0
		});
	}

	for (const entry of queryData.findManySingleParticipants) {
		const status = statusMap.get(entry.user.id);
		const birthday = entry.user.birthday ? new Date(entry.user.birthday) : null;
		rows.push({
			userId: entry.user.id,
			given_name: entry.user.given_name,
			family_name: entry.user.family_name,
			email: entry.user.email,
			phone: entry.user.phone ?? null,
			birthday,
			gender: entry.user.gender ?? null,
			pronouns: entry.user.pronouns ?? null,
			foodPreference: entry.user.foodPreference ?? null,
			city: entry.user.city ?? null,
			country: entry.user.country ?? null,
			role: 'SINGLE_PARTICIPANT',
			nationAlpha2Code: null,
			nationAlpha3Code: null,
			nsaName: null,
			nsaIcon: null,
			committee: null,
			delegationSchool: entry.school ?? null,
			isHeadDelegate: null,
			assignedRoleName: entry.assignedRole?.name ?? null,
			assignedRoleIcon: entry.assignedRole?.fontAwesomeIcon ?? null,
			teamRole: null,
			plansOwnAttendance: null,
			accepted: !!entry.assignedRole,
			paymentStatus: (status?.paymentStatus as AdministrativeStatus) ?? 'PENDING',
			postalRegistrationStatus: status
				? computePostalRegistrationStatus(status, startConference, birthday)
				: 'PENDING',
			termsAndConditions: (status?.termsAndConditions as AdministrativeStatus) ?? 'PENDING',
			guardianConsent: (status?.guardianConsent as AdministrativeStatus) ?? 'PENDING',
			mediaConsent: (status?.mediaConsent as AdministrativeStatus) ?? 'PENDING',
			mediaConsentStatus: status?.mediaConsentStatus ?? null,
			didAttend: status?.didAttend ?? null,
			documentNumber: status?.assignedDocumentNumber ?? null,
			accessCardId: status?.accessCardId ?? null,
			ageAtConference:
				birthday && startConference
					? (getAgeAtConference(birthday, startConference) ?? null)
					: null,
			participationCount: entry.user.conferenceParticipationsCount ?? 0
		});
	}

	for (const entry of queryData.findManyTeamMembers) {
		const status = statusMap.get(entry.user.id);
		const birthday = entry.user.birthday ? new Date(entry.user.birthday) : null;
		rows.push({
			userId: entry.user.id,
			given_name: entry.user.given_name,
			family_name: entry.user.family_name,
			email: entry.user.email,
			phone: entry.user.phone ?? null,
			birthday,
			gender: entry.user.gender ?? null,
			pronouns: entry.user.pronouns ?? null,
			foodPreference: entry.user.foodPreference ?? null,
			city: entry.user.city ?? null,
			country: entry.user.country ?? null,
			role: 'TEAM_MEMBER',
			nationAlpha2Code: null,
			nationAlpha3Code: null,
			nsaName: null,
			nsaIcon: null,
			committee: null,
			delegationSchool: null,
			isHeadDelegate: null,
			assignedRoleName: null,
			assignedRoleIcon: null,
			teamRole: entry.role,
			plansOwnAttendance: null,
			accepted: true,
			paymentStatus: (status?.paymentStatus as AdministrativeStatus) ?? 'PENDING',
			postalRegistrationStatus: status
				? computePostalRegistrationStatus(status, startConference, birthday)
				: 'PENDING',
			termsAndConditions: (status?.termsAndConditions as AdministrativeStatus) ?? 'PENDING',
			guardianConsent: (status?.guardianConsent as AdministrativeStatus) ?? 'PENDING',
			mediaConsent: (status?.mediaConsent as AdministrativeStatus) ?? 'PENDING',
			mediaConsentStatus: status?.mediaConsentStatus ?? null,
			didAttend: status?.didAttend ?? null,
			documentNumber: status?.assignedDocumentNumber ?? null,
			accessCardId: status?.accessCardId ?? null,
			ageAtConference:
				birthday && startConference
					? (getAgeAtConference(birthday, startConference) ?? null)
					: null,
			participationCount: entry.user.conferenceParticipationsCount ?? 0
		});
	}

	return rows;
}
