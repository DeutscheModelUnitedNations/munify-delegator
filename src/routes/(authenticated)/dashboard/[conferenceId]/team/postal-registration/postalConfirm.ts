import { ofAgeAtConference } from '$lib/helpers/ageChecker';
import type { StatusChange } from '$lib/components/scanner/scannedUserFlow.svelte';

/** The scanned user together with their status row, or `undefined` when either is missing. */
export function scannedUserWithStatus<U, S>(
	data: { user: U | null; status: S | null } | undefined
): { user: U; status: S } | undefined {
	if (!data?.user || !data.status) return undefined;
	return { user: data.user, status: data.status };
}

/**
 * "Confirm all": every postal document is in. The guardian's consent is only marked when the
 * person is still a minor at the conference; for adults it is left as it is.
 */
export function confirmAllChange(
	startConference: Date | string | null | undefined,
	birthday: Date | string | null | undefined
): StatusChange {
	return {
		termsAndConditions: 'DONE',
		mediaConsent: 'DONE',
		guardianConsent: ofAgeAtConference(startConference, birthday) ? undefined : 'DONE',
		mediaConsentStatus: 'ALLOWED_ALL'
	};
}
