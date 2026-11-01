import { client, type ScanIssue } from '#lib/api/rumbleClient/client';

/**
 * A scanned person as the entrance scanner shows them. The code is a user id; the server answers
 * with a fixed set of fields, so any team member can check someone without being allowed to read
 * their user or status rows.
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
		didAttend: boolean;
		paymentStatus: 'DONE' | 'PROBLEM' | 'PENDING';
		termsAndConditions: 'DONE' | 'PROBLEM' | 'PENDING';
		guardianConsent: 'DONE' | 'PROBLEM' | 'PENDING';
	};
	/** The titles of the survey options the session expects that the person picked none of. */
	missingSurveyOptions: string[];
	/** The server's check: what is open, whether it passed, and whether a scan may be recorded anyway. */
	check: {
		issues: ScanIssue[];
		passed: boolean;
		mayRecordAnyway: boolean;
	};
}

const orNull = <T>(value: T | null | undefined): T | null => value ?? null;

/**
 * The person a code leads to, or `null` when it leads to nobody. A plain query, read again after
 * changes. With a session, the survey options it expects are checked too, and with `asScan` an
 * earlier scan of the person in it.
 */
export async function loadScannedPerson({
	conferenceId,
	code,
	sessionId,
	asScan = false
}: {
	conferenceId: string;
	code: string;
	sessionId?: string;
	asScan?: boolean;
}): Promise<FoundPerson | null> {
	const found = await client.query.scanLookup({
		__args: { conferenceId, code, sessionId, asScan },
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
		didAttend: true,
		paymentStatus: true,
		termsAndConditions: true,
		guardianConsent: true,
		missingSurveyOptions: true,
		issues: true,
		checkPassed: true,
		mayRecordAnyway: true
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
			didAttend: found.didAttend,
			paymentStatus: found.paymentStatus,
			termsAndConditions: found.termsAndConditions,
			guardianConsent: found.guardianConsent
		},
		missingSurveyOptions: [...found.missingSurveyOptions],
		check: {
			issues: [...found.issues],
			passed: found.checkPassed,
			mayRecordAnyway: found.mayRecordAnyway
		}
	};
}
