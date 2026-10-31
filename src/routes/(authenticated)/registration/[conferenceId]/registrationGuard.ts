import type { RegistrationStatus } from '#lib/utils/registrationStatus';

/**
 * Where the registration flow sends someone at `pathname`, or undefined to let them stay: to the
 * dashboard unless registration is open, to the waiting list while only that is open.
 */
export function registrationRedirect({
	status,
	pathname,
	conferenceId
}: {
	status: RegistrationStatus;
	pathname: string;
	conferenceId: string;
}): string | undefined {
	if (status === 'OPEN') return undefined;
	if (status !== 'WAITING_LIST') return `/dashboard/${conferenceId}`;
	if (pathname.endsWith('waiting-list')) return undefined;
	return `/registration/${conferenceId}/waiting-list`;
}
