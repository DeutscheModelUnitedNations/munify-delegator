/**
 * Who sees what in the management area of a conference. `membership` is the team role of the user
 * in that conference, or `SYSTEM_ADMIN` for system wide admins.
 *
 * These checks only shape navigation; the CASL abilities on the API are the real protection.
 */

const seatPlanningPath = (conferenceId: string) => `/management/${conferenceId}/seat-planning`;

/** Content leads only work on the seat planning, the rest of the management area is hidden */
export const isSeatPlanningOnly = (membership: string | undefined) => membership === 'CONTENT_LEAD';

export const canPlanSeats = (membership: string | undefined) =>
	membership === 'SYSTEM_ADMIN' ||
	membership === 'PROJECT_MANAGEMENT' ||
	membership === 'CONTENT_LEAD';

/** Creating and deleting committees and changing their seats per delegation */
export const canConfigureCommittees = (membership: string | undefined) =>
	membership === 'SYSTEM_ADMIN' || membership === 'PROJECT_MANAGEMENT';

/**
 * Where to send a user who opened `pathname` inside the management area of a conference, or
 * `undefined` if they may stay.
 */
export function managementRedirect(
	conferenceId: string,
	pathname: string,
	membership: string | undefined
) {
	const seatPlanning = seatPlanningPath(conferenceId);
	const onSeatPlanning = pathname === seatPlanning || pathname.startsWith(`${seatPlanning}/`);

	if (isSeatPlanningOnly(membership) && !onSeatPlanning) return seatPlanning;
	if (onSeatPlanning && !canPlanSeats(membership)) return `/management/${conferenceId}`;
	return undefined;
}
