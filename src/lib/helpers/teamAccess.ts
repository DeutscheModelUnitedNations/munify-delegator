import type { TeamroleEnum } from '#lib/api/rumbleClient/client.js';
import {
	CONFERENCE_CONTENT_ROLES,
	PARTICIPANT_CARE_ROLES,
	PROJECT_MANAGEMENT_ROLES,
	SEAT_PLANNING_ROLES
} from './teamRoles';

/**
 * What the caller is in one conference's team: every role they hold (not just the first), and
 * whether they are a system admin, who passes every check whether or not they are on the team.
 *
 * These checks shape what the pages offer; the abilities on the API are the real protection.
 */
export interface TeamAccess {
	isAdmin: boolean;
	roles: readonly TeamroleEnum[];
}

/** Someone with no part in the team at all */
export const NO_TEAM_ACCESS: TeamAccess = { isAdmin: false, roles: [] };

/** On the team in any role, or a system admin */
export const isOnTeam = (access: TeamAccess) => access.isAdmin || access.roles.length > 0;

/** A system admin, or holding at least one of `roles` */
export const hasAnyRole = (access: TeamAccess, roles: readonly TeamroleEnum[]) =>
	access.isAdmin || roles.some((role) => access.roles.includes(role));

/** Changing the conference itself: its settings and its committees' existence */
export const canEditConference = (access: TeamAccess) =>
	hasAnyRole(access, PROJECT_MANAGEMENT_ROLES);

/** Links, postal address, templates, status, features and resolutions */
export const canEditConferenceContent = (access: TeamAccess) =>
	hasAnyRole(access, CONFERENCE_CONTENT_ROLES);

/** Editing committees, their seats and agenda items; creating and deleting is `canEditConference` */
export const canEditCommittees = (access: TeamAccess) => hasAnyRole(access, SEAT_PLANNING_ROLES);

/** Planning which nations sit where */
export const canPlanSeats = (access: TeamAccess) => hasAnyRole(access, SEAT_PLANNING_ROLES);

/** Switching the automatic mails and writing their texts */
export const canManageEmails = (access: TeamAccess) => hasAnyRole(access, PARTICIPANT_CARE_ROLES);

/** Storing an access card on a person's status, which the scanner's badge option does */
export const canWriteAccessCards = (access: TeamAccess) =>
	hasAnyRole(access, PARTICIPANT_CARE_ROLES);
