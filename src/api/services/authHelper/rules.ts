/** Who may do what: the filters and checks every `*Permissions.ts` composes its rules from. */
import { db, schema, type Transaction } from '#api/db/db';
import { sql } from 'drizzle-orm';
import type { ApiContext } from '#api/rumble';
import type { Context } from '#api/context';
import type { teamRole } from '#api/db/schema/index';
import { DELEGATION_ROLE_KINDS, type ConferenceRoleKind } from '#lib/helpers/conferenceRole';
import {
	PARTICIPANT_CARE_ROLES,
	rolesWithTeamPermission,
	type TeamPermission
} from '#lib/helpers/teamRoles';
import { m } from '#lib/paraglide/messages';
import { translateTeamRole } from '#lib/utils/enumTranslations';
import { apiError } from '#api/services/errors';
import { callerUserId } from './utils';

export type TeamRole = (typeof teamRole.enumValues)[number];

export {
	CONFERENCE_CONTENT_ROLES,
	PAPER_ROLES,
	PARTICIPANT_CARE_ROLES,
	PROJECT_MANAGEMENT_ROLES,
	SEAT_PLANNING_ROLES,
	TEAM_ADMIN_ROLES
} from '#lib/helpers/teamRoles';

/** For `abilityBuilder.x.allow(...).when(systemAdmin)`: the per-table stand-in for a wildcard. */
export function systemAdmin(ctx: Context) {
	return isSystemAdmin(ctx) ? ('allow' as const) : undefined;
}

/** System-wide admin, via the OIDC role claim. */
export function isSystemAdmin(ctx: Context) {
	return ctx.hasRole('admin');
}
/**
 * Matches a Conference row whose team includes the caller, optionally only with one of `roles`.
 * A system admin matches every conference; undefined (nobody) for an anonymous caller.
 */
export function isTeamMemberOf({ ctx, roles }: { ctx: Context; roles?: readonly TeamRole[] }) {
	if (isSystemAdmin(ctx)) return {};
	const id = callerUserId(ctx);
	if (!id) return undefined;
	return {
		teamMembers: roles ? { user: { id }, role: { in: [...roles] } } : { user: { id } }
	};
}

/** `isTeamMemberOf` one level down: matches a row whose `conference` has the caller on its team. */
export function isTeamMemberOfConference({
	ctx,
	roles
}: {
	ctx: Context;
	roles?: readonly TeamRole[];
}) {
	const conference = isTeamMemberOf({ ctx, roles });
	return conference === undefined ? undefined : { conference };
}

/** Matches a Conference row in which the caller holds the team `permission` (`rolesWithTeamPermission`). */
function isTeamPermittedIn({ ctx, permission }: { ctx: Context; permission: TeamPermission }) {
	return isTeamMemberOf({ ctx, roles: rolesWithTeamPermission(permission) });
}

/** A filter matching no row, for a query `where` that must not be left without one. */
const NOTHING = { RAW: sql`false` };

/**
 * The conferences in which the caller holds `permission`, as a filter to put into a query:
 * `where: { id, conference: teamConference({ ctx, permission: 'manageParticipants' }) }` finds nothing for a caller
 * without it. Unlike `isTeamPermittedIn` it never returns undefined (which would match every row);
 * it throws for an anonymous caller instead.
 */
export function teamConference({ ctx, permission }: { ctx: Context; permission: TeamPermission }) {
	ctx.mustBeLoggedIn();
	return isTeamPermittedIn({ ctx, permission }) ?? NOTHING;
}

/**
 * Whether the caller holds the team `permission` in the conference, asked on its own. Only for a check with no
 * query of its own to carry `teamConference`; pass `tx` inside a transaction.
 *
 * ATTENTION: This actively performs a query
 */
export async function hasTeamPermission({
	ctx,
	conferenceId,
	permission,
	tx = db
}: {
	ctx: Context;
	conferenceId: string;
	permission: TeamPermission;
	tx?: Transaction | typeof db;
}) {
	const team = isTeamPermittedIn({ ctx, permission });
	if (!team) return false;
	const conference = await tx.query.conference.findFirst({
		where: { id: conferenceId, ...team },
		columns: { id: true }
	});
	return conference !== undefined;
}

/**
 * Refuses unless the caller holds the team `permission` in the conference (`hasTeamPermission`).
 *
 * This is how a create is authorized: there is no row of its own to run an ability against yet, so
 * the conference it goes into is checked for the permission.
 */
export async function assertTeamPermission({
	ctx,
	conferenceId,
	permission,
	tx = db
}: {
	ctx: ApiContext;
	conferenceId: string;
	permission: TeamPermission;
	tx?: Transaction | typeof db;
}) {
	ctx.mustBeLoggedIn();
	if (!(await hasTeamPermission({ ctx, conferenceId, permission, tx }))) {
		const roles = rolesWithTeamPermission(permission);
		throw apiError({
			code: 'FORBIDDEN',
			message: roles
				? m.accessDeniedTeamRoles({ roles: roles.map(translateTeamRole).join(', ') })
				: m.accessDeniedTeamMember()
		});
	}
}

/** Matches a row whose `user` is the caller; undefined for an anonymous caller. */
export function isOwnUser(ctx: Context) {
	const id = callerUserId(ctx);
	return id ? { user: { id } } : undefined;
}

/** Matches a row whose `delegation` has the caller among its members; undefined for an anonymous caller. */
export function isInOwnDelegation(ctx: Context) {
	const id = callerUserId(ctx);
	return id ? { delegation: { members: { user: { id } } } } : undefined;
}

/**
 * A ConferenceParticipant row that is currently registered as delegate, single participant or
 * supervisor (the row outlives the registration). Team and waiting list never count.
 */
const conferenceParticipantWithRegistration = {
	OR: [{ delegationMember: true }, { singleParticipant: true }, { conferenceSupervisor: true }]
};

/**
 * Matches a Conference row the caller is registered in as delegate, single participant or
 * supervisor - the participant counterpart of `isTeamMemberOf`. Team and waiting list do not count.
 */
export function isParticipantOf(ctx: Context) {
	const id = callerUserId(ctx);
	return id
		? { conferenceParticipants: { userId: id, ...conferenceParticipantWithRegistration } }
		: undefined;
}

/** `isParticipantOf` one level down: matches a row whose `conference` the caller is registered in. */
export function isParticipantOfConference(ctx: Context) {
	const conference = isParticipantOf(ctx);
	return conference === undefined ? undefined : { conference };
}

/**
 * Matches a ConferenceParticipant row registered (delegate, single participant or supervisor) in a
 * conference matching `conference`. A row kept after its registration ended does not match.
 */
export function registeredParticipantIn(conference: { id: string } | object) {
	return { conference, ...conferenceParticipantWithRegistration };
}

/** Matches a User row registered as participant in a conference matching `conference`. */
export function participatesIn(conference: { id: string } | object) {
	return { conferenceParticipants: registeredParticipantIn(conference) };
}

/**
 * The User rows in the caller's care: the participants (`participatesIn`) and waiting-list
 * entrants of a conference where the caller is participant care or project management. A system admin looks after
 * everybody. The team is not among them: care notes are about participants, and a teammate's
 * (perhaps from when they took part themselves) is not their colleagues' to read. What the team
 * admins need of their team for planning is its own rule on the user table.
 */
export function isCaredForUser(ctx: Context) {
	if (isSystemAdmin(ctx)) return {};
	const conference = isTeamMemberOf({ ctx, roles: PARTICIPANT_CARE_ROLES });
	if (!conference) return undefined;
	return { OR: [participatesIn(conference), { waitingListEntry: { conference } }] };
}

type ConferenceState = (typeof schema.conferenceState.enumValues)[number];

/**
 * Matches a public Conference row: open for registration or, from the assignment on, for the
 * waiting list. Anybody reads such a conference, short of its members-only columns.
 */
export const publicConference = {
	state: { in: ['PARTICIPANT_REGISTRATION', 'PREPARATION'] satisfies ConferenceState[] }
};

/**
 * Conference filters for the conferences the caller has a part in - as participant (delegate,
 * single participant, supervisor) or on the team - one per way, to `OR` together. Empty for an
 * anonymous caller; a system admin's team filter matches every conference. `asParticipant`
 * narrows the participant way only.
 */
function conferencesOfCaller({ ctx, asParticipant }: { ctx: Context; asParticipant: object }) {
	const participant = isParticipantOf(ctx);
	const team = isTeamMemberOf({ ctx });
	return [...(participant ? [{ ...participant, ...asParticipant }] : []), ...(team ? [team] : [])];
}

/**
 * Matches a Conference row the caller has a part in, as participant or on the team; undefined for
 * an anonymous caller. `asParticipant` narrows what participants get to see, the team always
 * does: `hasPartIn({ ctx, asParticipant: { showCalendar: true } })` for the schedule.
 */
export function hasPartIn({ ctx, asParticipant = {} }: { ctx: Context; asParticipant?: object }) {
	const ways = conferencesOfCaller({ ctx, asParticipant });
	return ways.length > 0 ? { OR: ways } : undefined;
}

/**
 * The conferences the caller may read: the public ones and those they have a part in. What only
 * makes sense next to a conference - its committees, agenda items and roles, which the seat
 * overview shows - follows it, so a conference in PRE or POST hides its set-up from strangers too.
 */
export function readableConference(ctx: Context) {
	return { OR: [publicConference, ...conferencesOfCaller({ ctx, asParticipant: {} })] };
}

/**
 * The `conferenceParticipant` ids of `userIds` in the conference, by user id. Refuses unless every
 * one of them takes part in it (delegate, single participant or supervisor), so writes that name
 * other people by id can use it as their guard and get the rows to point at in one go.
 */
export async function participantIdsOf({
	conferenceId,
	userIds,
	tx = db
}: {
	conferenceId: string;
	userIds: readonly string[];
	tx?: Transaction | typeof db;
}): Promise<Map<string, string>> {
	const unique = [...new Set(userIds)];
	if (unique.length === 0) return new Map();
	const found = await tx.query.conferenceParticipant.findMany({
		where: { conferenceId, userId: { in: unique }, ...conferenceParticipantWithRegistration },
		columns: { id: true, userId: true }
	});
	if (found.length !== unique.length) {
		throw apiError({ code: 'INVALID_INPUT', message: m.usersNotInConference() });
	}
	return new Map(found.map((row) => [row.userId, row.id]));
}

/**
 * Whether the conference has the role and committee the arguments name, and the role is of one
 * of `roleKinds` (a delegation's by default); an absent one passes. A nation is the conference's
 * while one of its committees seats it, which `setCommitteeNationSeat` keeps its role row for.
 */
export async function offeredIn({
	conferenceId,
	ref,
	roleKinds = DELEGATION_ROLE_KINDS,
	tx = db
}: {
	conferenceId: string;
	ref: { roleId?: string | null; committeeId?: string | null };
	roleKinds?: readonly ConferenceRoleKind[];
	tx?: Transaction | typeof db;
}) {
	const [role, committee] = await Promise.all([
		ref.roleId
			? tx.query.conferenceRole.findFirst({
					where: { id: ref.roleId, conferenceId, kind: { in: [...roleKinds] } },
					columns: { id: true }
				})
			: true,
		ref.committeeId
			? tx.query.committee.findFirst({
					where: { id: ref.committeeId, conferenceId },
					columns: { id: true }
				})
			: true
	]);
	return Boolean(role && committee);
}

/** Refuses (INVALID_INPUT) a role or committee that the conference does not have (`offeredIn`). */
export async function assertOfferedIn({
	conferenceId,
	ref,
	roleKinds,
	tx = db
}: {
	conferenceId: string;
	ref: Parameters<typeof offeredIn>[0]['ref'];
	roleKinds?: readonly ConferenceRoleKind[];
	tx?: Transaction | typeof db;
}) {
	if (!(await offeredIn({ conferenceId, ref, roleKinds, tx }))) {
		throw apiError({ code: 'INVALID_INPUT', message: m.roleNotOnOffer() });
	}
}

/** Refuses (INVALID_INPUT) role ids that are not custom roles of the given conference. */
export async function assertCustomRolesOf({
	conferenceId,
	roleIds,
	tx = db
}: {
	conferenceId: string;
	roleIds: readonly string[];
	tx?: Transaction | typeof db;
}) {
	const unique = [...new Set(roleIds)];
	if (unique.length === 0) return;
	const roles = await tx.query.conferenceRole.findMany({
		where: { id: { in: unique }, conferenceId, kind: 'CUSTOM' },
		columns: { id: true }
	});
	if (roles.length !== unique.length) {
		throw apiError({ code: 'INVALID_INPUT', message: m.rolesNotInConference() });
	}
}

/**
 * Assignment visibility. Participants see the role they were assigned only once the team releases
 * the assignment (`conference.assignmentReleased`); the team always sees it. Before that, every
 * participant-side read rule comes in two variants: `maskedUntilRelease` lets the participant read
 * the row without its assignment, `onceReleased` adds the assignment back for released
 * conferences. Rumble masks per row, so a row shows a column if any rule it matches does, and it
 * follows the masks everywhere else (relations, `where`, `orderBy`), so nothing else is needed.
 */

/** A participant-side rule that reads the row but not its assignment (`assignmentColumns`). */
export function maskedUntilRelease<W extends object, C extends object>({
	filter,
	assignmentColumns
}: {
	filter: W | undefined;
	assignmentColumns: C;
}) {
	return filter ? { where: filter, columns: assignmentColumns } : undefined;
}

/** The same rule in full, for conferences whose assignment is released. */
export function onceReleased<W extends object>(filter: W | undefined) {
	return filter ? { where: { ...filter, conference: { assignmentReleased: true } } } : undefined;
}
