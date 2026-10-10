/**
 * Who sees what in the management area of a conference. `membership` is the team role of the user
 * in that conference, or `SYSTEM_ADMIN` for system wide admins.
 *
 * These checks only shape navigation; the abilities on the API are the real protection.
 */

const managementPath = (conferenceId: string) => `/dashboard/${conferenceId}/management`;
const seatPlanningPath = (conferenceId: string) => `${managementPath(conferenceId)}/seat-planning`;

/** Content leads only work on the seat planning, the rest of the management area is hidden */
export const isSeatPlanningOnly = (membership: string | undefined) => membership === 'CONTENT_LEAD';

export const canPlanSeats = (membership: string | undefined) =>
	membership === 'SYSTEM_ADMIN' ||
	membership === 'PROJECT_MANAGEMENT' ||
	membership === 'CONTENT_LEAD';

/** Storing an access card on a person's status, which the scanner's badge option does */
export const canWriteAccessCards = (membership: string | undefined) =>
	membership === 'SYSTEM_ADMIN' ||
	membership === 'PROJECT_MANAGEMENT' ||
	membership === 'PARTICIPANT_CARE';

/** Creating and deleting committees and changing their seats per delegation */
export const canConfigureCommittees = (membership: string | undefined) =>
	membership === 'SYSTEM_ADMIN' || membership === 'PROJECT_MANAGEMENT';

/** The team pages: project management and team coordinators, whatever else they hold */
const canManageTeam = (membership: string | undefined, teamRoles: readonly string[]) =>
	membership === 'SYSTEM_ADMIN' ||
	teamRoles.some((role) => role === 'PROJECT_MANAGEMENT' || role === 'TEAM_COORDINATOR');

/** What the management side navigation offers one person; every entry is a plain yes or no. */
export interface ManagementNav {
	/** The full management area (stats, settings, participants, workflows, maintenance) */
	management: boolean;
	/** The seat planning on its own, which content leads reach without the rest */
	seatPlanning: boolean;
	teamManagement: boolean;
	/** The attendance scanner, open to the whole team */
	scanner: boolean;
	paperHub: boolean;
}

/**
 * Which entries the navigation shows. `canSeePaperHub` is whether the paper hub has a view for
 * this person (reviewers, participants and supervisors); system admins always get it.
 */
export function managementNav(
	membership: string | undefined,
	teamRoles: readonly string[],
	canSeePaperHub: boolean
): ManagementNav {
	const management = !!membership && !isSeatPlanningOnly(membership);
	return {
		management,
		seatPlanning: canPlanSeats(membership) && !management,
		teamManagement: canManageTeam(membership, teamRoles),
		scanner: membership !== undefined || teamRoles.length > 0,
		paperHub: membership === 'SYSTEM_ADMIN' || canSeePaperHub
	};
}

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
	if (onSeatPlanning && !canPlanSeats(membership)) return managementPath(conferenceId);
	return undefined;
}
