import { client } from '$lib/api/rumbleClient/client';

/**
 * A scanned person as the entrance scanner shows them. The code may be an access card number or a
 * user id; the server resolves it and answers with a fixed set of fields, so any team member can
 * check someone without being allowed to read their user or status rows.
 */
export interface FoundPerson {
	user: {
		id: string;
		givenName: string | null;
		familyName: string | null;
		birthday: Date | null;
	};
	inConference: boolean;
	roles: {
		isHeadDelegate: boolean;
		isSupervisor: boolean;
		isTeamMember: boolean;
		isWaitingList: boolean;
		nationAlpha2Code: string | null;
		nationAlpha3Code: string | null;
		nonStateActorName: string | null;
		nonStateActorIcon: string | null;
		committeeAbbreviation: string | null;
		singleRoleName: string | null;
	};
	status: {
		accessCardId: string | null;
		didAttend: boolean;
		paymentStatus: 'DONE' | 'PROBLEM' | 'PENDING';
		termsAndConditions: 'DONE' | 'PROBLEM' | 'PENDING';
		guardianConsent: 'DONE' | 'PROBLEM' | 'PENDING';
	};
}

const orNull = <T>(value: T | null | undefined): T | null => value ?? null;

/** The person a code leads to, or `null` when it leads to nobody. A plain query, read again after changes. */
export async function loadScannedPerson(
	conferenceId: string,
	code: string
): Promise<FoundPerson | null> {
	const found = await client.query.scanLookup({
		__args: { conferenceId, code },
		found: true,
		userId: true,
		givenName: true,
		familyName: true,
		birthday: true,
		inConference: true,
		isHeadDelegate: true,
		isSupervisor: true,
		isTeamMember: true,
		isWaitingList: true,
		nationAlpha2Code: true,
		nationAlpha3Code: true,
		nonStateActorName: true,
		nonStateActorIcon: true,
		committeeAbbreviation: true,
		singleRoleName: true,
		accessCardId: true,
		didAttend: true,
		paymentStatus: true,
		termsAndConditions: true,
		guardianConsent: true
	});
	if (!found.found || !found.userId) return null;
	return {
		user: {
			id: found.userId,
			givenName: orNull(found.givenName),
			familyName: orNull(found.familyName),
			birthday: found.birthday ? new Date(found.birthday) : null
		},
		inConference: found.inConference,
		roles: {
			isHeadDelegate: found.isHeadDelegate,
			isSupervisor: found.isSupervisor,
			isTeamMember: found.isTeamMember,
			isWaitingList: found.isWaitingList,
			nationAlpha2Code: orNull(found.nationAlpha2Code),
			nationAlpha3Code: orNull(found.nationAlpha3Code),
			nonStateActorName: orNull(found.nonStateActorName),
			nonStateActorIcon: orNull(found.nonStateActorIcon),
			committeeAbbreviation: orNull(found.committeeAbbreviation),
			singleRoleName: orNull(found.singleRoleName)
		},
		status: {
			accessCardId: orNull(found.accessCardId),
			didAttend: found.didAttend,
			paymentStatus: found.paymentStatus,
			termsAndConditions: found.termsAndConditions,
			guardianConsent: found.guardianConsent
		}
	};
}
