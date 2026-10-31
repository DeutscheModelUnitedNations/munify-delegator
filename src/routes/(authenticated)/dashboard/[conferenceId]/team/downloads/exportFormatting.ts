import formatNames from '#lib/helpers/formatNames';

interface NamedUser {
	givenName: string | null;
	familyName: string | null;
}

/** "Familyname Givenname", the order the exported lists sort people in. */
export function sortableName(user: NamedUser): string {
	return formatNames({
		givenName: user.givenName ?? undefined,
		familyName: user.familyName ?? undefined,
		options: {
			givenNameFirst: false
		}
	});
}

/** Sorts people by `sortableName`. */
export function compareByName(a: { user: NamedUser }, b: { user: NamedUser }): number {
	return sortableName(a.user).localeCompare(sortableName(b.user));
}

/** Sorts people by family name alone. */
export function compareByFamilyName(a: { user: NamedUser }, b: { user: NamedUser }): number {
	return (a.user.familyName ?? '').localeCompare(b.user.familyName ?? '');
}

type RegistrationStatus = 'DONE' | 'PENDING' | 'PROBLEM';

/** A status cell of the registration lists: empty when done, `X` while pending, `P` on a problem. */
export function formatRegistrationStatus(status: RegistrationStatus | undefined): string {
	if (status === 'DONE') return '';
	if (status === 'PROBLEM') return 'P';
	return 'X';
}

interface RegistrationStatuses {
	paymentStatus: RegistrationStatus;
	termsAndConditions: RegistrationStatus;
	guardianConsent: RegistrationStatus;
	mediaConsent: RegistrationStatus;
}

/** The payment and paperwork columns; adults need no guardian consent. Ends with the of-age flag. */
export function registrationStatusColumns({
	status,
	ofAge
}: {
	status: RegistrationStatuses | undefined;
	ofAge: boolean;
}): string[] {
	return [
		formatRegistrationStatus(status?.paymentStatus),
		formatRegistrationStatus(status?.termsAndConditions),
		ofAge ? '' : formatRegistrationStatus(status?.guardianConsent),
		formatRegistrationStatus(status?.mediaConsent),
		ofAge ? 'Y' : 'N'
	];
}

/** A supervisor's row of the registration list. */
export function supervisorRow({
	supervisor,
	status
}: {
	supervisor: { user: NamedUser; plansOwnAttendenceAtConference: boolean };
	status: RegistrationStatuses | undefined;
}): string[] {
	return [
		supervisor.user.familyName ?? '',
		supervisor.user.givenName ?? '',
		formatRegistrationStatus(status?.paymentStatus),
		formatRegistrationStatus(status?.termsAndConditions),
		formatRegistrationStatus(status?.mediaConsent),
		supervisor.plansOwnAttendenceAtConference ? 'Y' : 'N'
	];
}

/** The name of the non-state actor (the role) a delegation represents, or an empty cell. */
export function nonStateActorName(delegation: {
	assignedRole?: { name?: string | null } | null;
}): string {
	return delegation.assignedRole?.name ?? '';
}
