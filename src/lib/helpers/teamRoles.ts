import type { TeamroleEnum } from '#lib/api/rumbleClient/client';

/**
 * Which team roles may do what, shared by the API's abilities (`authHelper/rules.ts`) and the
 * team pages' own checks (`teamAccess.ts`, the route registry), so a page never offers what the
 * API refuses and the other way round.
 */

/** Everything about the participants, their money and their papers. */
export const PARTICIPANT_CARE_ROLES = [
	'PROJECT_MANAGEMENT',
	'PARTICIPANT_CARE'
] as const satisfies readonly TeamroleEnum[];

/** Roles that may see and review the conference's papers: the whole team but the plain member. */
export const PAPER_ROLES = [
	'REVIEWER',
	'PROJECT_MANAGEMENT',
	'PARTICIPANT_CARE',
	'TEAM_COORDINATOR',
	'CONTENT_LEAD'
] as const satisfies readonly TeamroleEnum[];

/** Roles that manage the conference's team. */
export const TEAM_ADMIN_ROLES = [
	'PROJECT_MANAGEMENT',
	'TEAM_COORDINATOR'
] as const satisfies readonly TeamroleEnum[];

/**
 * Roles that plan the seats and shape the committees: committee seats per nation, non-state
 * actors, regional baselines, the committees and their agenda items.
 */
export const SEAT_PLANNING_ROLES = [
	'PROJECT_MANAGEMENT',
	'CONTENT_LEAD'
] as const satisfies readonly TeamroleEnum[];

/**
 * Roles that maintain the conference's content: the links, the postal address, the mail and
 * certificate templates, the participants' announcement, the adopted resolutions, the conference
 * status and the feature switches. The rest of the settings is project management's.
 */
export const CONFERENCE_CONTENT_ROLES = [
	'PROJECT_MANAGEMENT',
	'PARTICIPANT_CARE',
	'CONTENT_LEAD'
] as const satisfies readonly TeamroleEnum[];

/** Only the conference's leadership. */
export const PROJECT_MANAGEMENT_ROLES = [
	'PROJECT_MANAGEMENT'
] as const satisfies readonly TeamroleEnum[];

/**
 * What the team may do in its conference, by name, and the roles each is granted to
 * (`rolesWithTeamPermission`). The API turns one into a filter on the conference
 * (`isTeamPermittedIn` / `teamConference` in `authHelper/rules.ts`) that the query doing the work carries.
 */
const TEAM_PERMISSIONS = [
	'useTeamTools',
	'manageParticipants',
	'reviewPapers',
	'manageTeam',
	'planSeats',
	'editConferenceContent',
	'manageConference'
] as const;

export type TeamPermission = (typeof TEAM_PERMISSIONS)[number];

/** The roles each team permission is granted to (`rolesWithTeamPermission`); undefined for any. */
const TEAM_PERMISSION_ROLES: Record<TeamPermission, readonly TeamroleEnum[] | undefined> = {
	useTeamTools: undefined,
	manageParticipants: PARTICIPANT_CARE_ROLES,
	reviewPapers: PAPER_ROLES,
	manageTeam: TEAM_ADMIN_ROLES,
	planSeats: SEAT_PLANNING_ROLES,
	editConferenceContent: CONFERENCE_CONTENT_ROLES,
	manageConference: PROJECT_MANAGEMENT_ROLES
};

/** The team roles that hold `permission`, or undefined when every team role does. */
export function rolesWithTeamPermission(permission: TeamPermission) {
	return TEAM_PERMISSION_ROLES[permission];
}
