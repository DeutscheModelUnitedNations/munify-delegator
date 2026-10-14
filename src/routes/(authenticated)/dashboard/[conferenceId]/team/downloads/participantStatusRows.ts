import type {
	AdministrativestatusEnum,
	MediaconsentstatusEnum
} from '$lib/api/rumbleClient/client';

/** The status columns of the participant status export. */
export interface StatusData {
	termsAndConditions: AdministrativestatusEnum;
	guardianConsent: AdministrativestatusEnum;
	mediaConsent: AdministrativestatusEnum;
	mediaConsentStatus: MediaconsentstatusEnum;
	paymentStatus: AdministrativestatusEnum;
	didAttend: boolean;
}

/** What a person without a status row counts as. */
export const defaultStatus: StatusData = {
	termsAndConditions: 'PENDING',
	guardianConsent: 'PENDING',
	mediaConsent: 'PENDING',
	mediaConsentStatus: 'NOT_SET',
	paymentStatus: 'PENDING',
	didAttend: false
};

/** "Given Family" of every supervisor, comma separated, leaving out nameless ones. */
export function formatSupervisorNames(
	supervisors: Array<{ user: { givenName: string | null; familyName: string | null } }>
): string {
	return supervisors
		.map((s) => `${s.user.givenName ?? ''} ${s.user.familyName ?? ''}`.trim())
		.filter((name) => name.length > 0)
		.join(', ');
}

/**
 * Summarizes the postal documents (terms, guardian consent, media consent): PROBLEM if any is a
 * problem, else PENDING if any is pending, else DONE.
 */
export function summarizePostalStatus(status: StatusData): AdministrativestatusEnum {
	const postalFields = [status.termsAndConditions, status.guardianConsent, status.mediaConsent];
	if (postalFields.some((s) => s === 'PROBLEM')) return 'PROBLEM';
	if (postalFields.some((s) => s === 'PENDING')) return 'PENDING';
	return 'DONE';
}

/** Which of postal paperwork and payment are still open, as one label. */
export function calculateCombinedStatus(status: StatusData): string {
	const postalPending = summarizePostalStatus(status) !== 'DONE';
	const paymentPending = status.paymentStatus !== 'DONE';
	if (postalPending) return paymentPending ? 'Postal and Payment pending' : 'Only Postal pending';
	return paymentPending ? 'Only Payment pending' : 'Both not pending';
}

export interface ExportedUser {
	id: string;
	email: string | null;
	givenName: string | null;
	familyName: string | null;
}

/** What a row says about the person's role in the conference. */
export interface RoleColumns {
	roleType: string;
	roleName: string;
	committee?: string;
	supervisors?: string;
}

/** One person's row: who they are, what they are, and where their paperwork stands. */
export function exportRow(user: ExportedUser, role: RoleColumns, status: StatusData): string[] {
	return [
		user.id,
		user.email ?? '',
		user.givenName ?? '',
		user.familyName ?? '',
		role.roleType,
		role.roleName,
		role.committee ?? '',
		role.supervisors ?? '',
		status.termsAndConditions,
		status.guardianConsent,
		status.mediaConsent,
		summarizePostalStatus(status),
		status.mediaConsentStatus,
		status.paymentStatus,
		status.didAttend.toString(),
		calculateCombinedStatus(status)
	];
}
