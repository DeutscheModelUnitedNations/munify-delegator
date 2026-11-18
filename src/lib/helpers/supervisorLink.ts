/** The query parameter a supervisor's link carries their connection code in. */
const SUPERVISOR_CODE_PARAM = 'supervisorCode';

/** The anchor of the students' "connect a supervisor" section on their dashboard. */
export const SUPERVISOR_SECTION_ID = 'supervisors';

/**
 * The link a supervisor hands their students: it opens the student's dashboard of the conference
 * with the code filled in, and the student only has to confirm.
 */
export function supervisorConnectionLink({
	origin,
	conferenceId,
	connectionCode
}: {
	origin: string;
	conferenceId: string;
	connectionCode: string;
}) {
	const url = new URL(`/dashboard/${encodeURIComponent(conferenceId)}`, origin);
	url.searchParams.set(SUPERVISOR_CODE_PARAM, connectionCode);
	url.hash = SUPERVISOR_SECTION_ID;
	return url.toString();
}

/** The code a supervisor's link brought along, or an empty string when the page was opened otherwise. */
export function linkedSupervisorCode(url: { searchParams: Pick<URLSearchParams, 'get'> }) {
	return url.searchParams.get(SUPERVISOR_CODE_PARAM)?.trim() ?? '';
}
