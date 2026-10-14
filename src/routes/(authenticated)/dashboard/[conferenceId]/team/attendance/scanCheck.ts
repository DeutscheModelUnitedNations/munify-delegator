/** An open point the check shows for a scanned person. */
export type ScanIssue =
	'notInConference' | 'paymentOpen' | 'termsOpen' | 'guardianConsentOpen' | 'alreadyScanned';

type AdministrativeStatus = 'DONE' | 'PROBLEM' | 'PENDING';

export interface ScanCheckInput {
	/** Whether the person has any part in the conference. */
	inConference: boolean;
	/** The person's status row; without one everything counts as pending. */
	status: {
		paymentStatus: AdministrativeStatus;
		termsAndConditions: AdministrativeStatus;
		guardianConsent: AdministrativeStatus;
	} | null;
	birthday: Date | null | undefined;
	/** Whether this session holds a scan of the person already. */
	alreadyScanned: boolean;
	now?: Date;
}

/** Whether the person is under 18 on `now`; an unknown birthday counts as of age. */
export function isMinor(birthday: Date | null | undefined, now: Date) {
	if (!birthday) return false;
	const eighteenth = new Date(birthday);
	eighteenth.setFullYear(eighteenth.getFullYear() + 18);
	return eighteenth > now;
}

/** Without a status row everything counts as pending. */
const NO_STATUS = {
	paymentStatus: 'PENDING',
	termsAndConditions: 'PENDING',
	guardianConsent: 'PENDING'
} as const;

/** What is open for the scanned person, most important first. */
export function scanIssues(input: ScanCheckInput): ScanIssue[] {
	const status = input.status ?? NO_STATUS;
	// Only people under 18 need a guardian's consent
	const needsConsent = isMinor(input.birthday, input.now ?? new Date());
	const open: [boolean, ScanIssue][] = [
		[!input.inConference, 'notInConference'],
		[status.paymentStatus !== 'DONE', 'paymentOpen'],
		[status.termsAndConditions !== 'DONE', 'termsOpen'],
		[needsConsent && status.guardianConsent !== 'DONE', 'guardianConsentOpen'],
		[input.alreadyScanned, 'alreadyScanned']
	];
	return open.filter(([isOpen]) => isOpen).map(([, issue]) => issue);
}
