import { db, schema, type Transaction } from '#api/db/db';
import { and, eq, sql, type SQL } from 'drizzle-orm';
import type { ApiContext } from '#api/rumble';
import type { PgTable } from 'drizzle-orm/pg-core';
import type { Context } from '#api/context';
import type { teamRole } from '#api/db/schema/index';
import { DELEGATION_ROLE_KINDS, type ConferenceRoleKind } from '#lib/helpers/conferenceRole';

export type TeamRole = (typeof teamRole.enumValues)[number];

export {
	CONFERENCE_CONTENT_ROLES,
	PAPER_ROLES,
	PARTICIPANT_CARE_ROLES,
	PROJECT_MANAGEMENT_ROLES,
	SEAT_PLANNING_ROLES,
	TEAM_ADMIN_ROLES
} from '#lib/helpers/teamRoles';
import {
	PARTICIPANT_CARE_ROLES,
	rolesWithTeamPermission,
	type TeamPermission
} from '#lib/helpers/teamRoles';
import { m } from '#lib/paraglide/messages';
import { translateTeamRole } from '#lib/utils/enumTranslations';
import { apiError } from '#api/services/errors/apiError';

/** For `abilityBuilder.x.allow(...).when(systemAdmin)`: the per-table stand-in for a wildcard. */
export function systemAdmin(ctx: Context) {
	return isSystemAdmin(ctx) ? ('allow' as const) : undefined;
}

/** System-wide admin, via the OIDC role claim. */
export function isSystemAdmin(ctx: Context) {
	return ctx.hasRole('admin');
}

/** The logged-in user's id, or undefined for anonymous requests. */
export function userId(ctx: Context) {
	return ctx.oidc.user?.sub;
}

/** Wraps a filter for `.when()`: no filter means the rule grants nothing. */
export function where<W extends object>(filter: W | undefined) {
	return filter ? { where: filter } : undefined;
}

/** Matches a Conference row whose team includes the user, optionally with one of `roles`. */
export function isTeamMemberOf(ctx: Context, roles?: readonly TeamRole[]) {
	if (isSystemAdmin(ctx)) return {};
	const id = userId(ctx);
	if (!id) return undefined;
	return {
		teamMembers: roles ? { user: { id }, role: { in: [...roles] } } : { user: { id } }
	};
}

/** Matches a row whose `conference` has the user on its team, optionally with one of `roles`. */
export function isTeamMemberOfConference(ctx: Context, roles?: readonly TeamRole[]) {
	const conference = isTeamMemberOf(ctx, roles);
	return conference === undefined ? undefined : { conference };
}

/** Matches a Conference row in which the user holds the team `permission` (`rolesWithTeamPermission`). */
export function isTeamPermittedIn(ctx: Context, permission: TeamPermission) {
	return isTeamMemberOf(ctx, rolesWithTeamPermission(permission));
}

/** A filter matching no row, for a query `where` that must not be left without one. */
const NOTHING = { RAW: sql`false` };

/**
 * The conferences in which the caller holds `permission`, as a filter to put into a query:
 * `where: { id, conference: teamConference(ctx, 'manageParticipants') }` finds nothing for a caller
 * without it. Unlike `isTeamPermittedIn` it never returns undefined (which would match every row);
 * it throws for an anonymous caller instead.
 */
export function teamConference(ctx: Context, permission: TeamPermission) {
	ctx.mustBeLoggedIn();
	return isTeamPermittedIn(ctx, permission) ?? NOTHING;
}

/** Matches rows belonging to the logged-in user through a `user` relation. */
export function isOwnUser(ctx: Context) {
	const id = userId(ctx);
	return id ? { user: { id } } : undefined;
}

/** Matches a row whose `delegation` has the logged-in user among its members. */
export function isInOwnDelegation(ctx: Context) {
	const id = userId(ctx);
	return id ? { delegation: { members: { user: { id } } } } : undefined;
}

/**
 * A ConferenceParticipant row that is currently registered as delegate, single participant or
 * supervisor (the row outlives the registration). Team and waiting list never count.
 */
const conferenceParticipantWithRegistration = {
	OR: [{ delegationMember: true }, { singleParticipant: true }, { conferenceSupervisor: true }]
};

/** Matches a Conference row the user takes part in - the counterpart of `isTeamMemberOf`. */
export function isParticipantOf(ctx: Context) {
	const id = userId(ctx);
	return id ? { conferenceParticipants: { userId: id, ...conferenceParticipantWithRegistration } } : undefined;
}

/** Matches a row whose `conference` the user takes part in. */
export function isParticipantOfConference(ctx: Context) {
	const conference = isParticipantOf(ctx);
	return conference === undefined ? undefined : { conference };
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
export function conferencesOfCaller(ctx: Context, asParticipant: object = {}) {
	const participant = isParticipantOf(ctx);
	const team = isTeamMemberOf(ctx);
	return [
		...(participant ? [{ ...participant, ...asParticipant }] : []),
		...(team ? [team] : [])
	];
}

/** A filter matching any of `filters`, or undefined when there are none. */
export function anyOf<F extends object>(filters: F[]) {
	return filters.length > 0 ? { OR: filters } : undefined;
}

/**
 * The conferences the caller may read: the public ones and those they have a part in. What only
 * makes sense next to a conference - its committees, agenda items and roles, which the seat
 * overview shows - follows it, so a conference in PRE or POST hides its set-up from strangers too.
 */
export function readableConference(ctx: Context) {
	return { OR: [publicConference, ...conferencesOfCaller(ctx)] };
}

/**
 * The conferences whose schedule (calendar days, tracks, entries, places) the caller may read:
 * the team's always, a participant's once the team has switched the calendar on (`showCalendar`),
 * which is when the dashboard shows it. Undefined for an anonymous caller.
 */
export function calendarConference(ctx: Context) {
	return anyOf(conferencesOfCaller(ctx, { showCalendar: true }));
}

/** A User row taking part in a conference matching `conference` (see `withRegistration`). */
export function participatesIn(conference: { id: string } | object) {
	return { conferenceParticipants: { conference, ...conferenceParticipantWithRegistration } };
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
	const conference = isTeamMemberOf(ctx, PARTICIPANT_CARE_ROLES);
	if (!conference) return undefined;
	return { OR: [participatesIn(conference), { waitingListEntry: { conference } }] };
}

/**
 * Whether the caller holds the team `permission` in the conference, asked on its own. Only for a check with no
 * query of its own to carry `teamConference`; pass `tx` inside a transaction.
 */
export async function hasTeamPermission(
	ctx: Context,
	conferenceId: string,
	permission: TeamPermission,
	tx: Transaction | typeof db = db
) {
	const team = isTeamPermittedIn(ctx, permission);
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
export async function assertTeamPermission(
	ctx: ApiContext,
	conferenceId: string,
	permission: TeamPermission,
	tx: Transaction | typeof db = db
) {
	ctx.mustBeLoggedIn();
	if (!(await hasTeamPermission(ctx, conferenceId, permission, tx))) {
		const roles = rolesWithTeamPermission(permission);
		throw apiError(
			'FORBIDDEN',
			roles
				? m.accessDeniedTeamRoles({ roles: roles.map(translateTeamRole).join(', ') })
				: m.accessDeniedTeamMember()
		);
	}
}

/**
 * Refuses to hand out a team role the caller may not grant: project management and team
 * coordinators manage the team, but only project management (or an admin) makes somebody project
 * management - otherwise a coordinator could promote themselves.
 */
export async function assertMayGrantRole(ctx: ApiContext, conferenceId: string, role: TeamRole) {
	await assertTeamPermission(
		ctx,
		conferenceId,
		role === 'PROJECT_MANAGEMENT' ? 'manageConference' : 'manageTeam'
	);
}

/** Refuses unless the calendar day exists in a conference where the caller holds `permission`. */
export async function assertTeamPermissionForCalendarDay(
	ctx: ApiContext,
	calendarDayId: string,
	permission: TeamPermission = 'manageParticipants'
) {
	const day = await db.query.calendarDay.findFirst({
		where: { id: calendarDayId, conference: teamConference(ctx, permission) },
		columns: { conferenceId: true }
	});
	if (!day) {
		throw apiError('NOT_FOUND', m.calendarDayNotFound());
	}
	return day;
}

/** Refuses unless the survey question exists in a conference where the caller holds `permission`. */
export async function assertTeamPermissionForSurveyQuestion(
	ctx: ApiContext,
	questionId: string,
	permission: TeamPermission = 'manageParticipants'
) {
	const question = await db.query.surveyQuestion.findFirst({
		where: { id: questionId, conference: teamConference(ctx, permission) },
		columns: { conferenceId: true }
	});
	if (!question) {
		throw apiError('NOT_FOUND', m.surveyQuestionNotFound());
	}
}

/**
 * Refuses with NOT_FOUND unless a row of `table` matches `allowed`: the row's own ability filter
 * merged with its id, `(await ctx.abilities.x.filter('delete')).merge({ where: { id } }).sql.where`.
 * This is how an update or delete is authorized when the resolver needs nothing of the row; a
 * missing row and a forbidden one look the same, so neither leaks the other.
 */
export async function assertAllowedRow(
	table: PgTable,
	allowed: SQL | undefined,
	message: () => string = m.deleteNotFoundOrForbidden
) {
	const [row] = await db
		.select({ found: sql`1` })
		.from(table)
		.where(allowed)
		.limit(1);
	if (!row) {
		throw apiError('NOT_FOUND', message());
	}
}

/** The ability actions a row can be checked against. */
type RowAction = 'read' | 'update' | 'delete';

/** The tables whose rows are addressed by an `id` column, by the names their abilities go by. */
type TableWithId = {
	[K in keyof ApiContext['abilities']]: (typeof schema)[K] extends { id: unknown } ? K : never;
}[keyof ApiContext['abilities']];

/**
 * The row `id` of `table`, as far as the caller's `action` ability reaches: a `where` for an
 * update or delete that touches nothing when the caller may not. `extra` narrows it further (a
 * role of one `kind`, a row of one conference).
 */
export async function allowedRowWhere<K extends TableWithId>(
	ctx: ApiContext,
	table: K,
	action: RowAction,
	id: string,
	extra?: SQL
) {
	const allowed = (await ctx.abilities[table].filter(action)).sql.where;
	return and(eq(schema[table].id, id), allowed, extra);
}

/**
 * `assertAllowedRow` for the row `id` of `table` through the caller's `action` ability: refuses
 * with NOT_FOUND unless the caller may do it.
 */
export async function assertAllowedById<K extends TableWithId>(
	ctx: ApiContext,
	table: K,
	action: RowAction,
	id: string,
	options: { extra?: SQL; message?: () => string } = {}
) {
	await assertAllowedRow(
		schema[table],
		await allowedRowWhere(ctx, table, action, id, options.extra),
		options.message ?? (action === 'update' ? m.updateNotFoundOrForbidden : undefined)
	);
}

/**
 * Deletes the row `id` of `table` through the caller's delete ability, in one statement, and
 * refuses with NOT_FOUND when that deleted nothing: a missing row and a forbidden one look the
 * same.
 */
export async function deleteAllowedRow<K extends TableWithId>(
	ctx: ApiContext,
	table: K,
	id: string,
	message: () => string = m.deleteNotFoundOrForbidden
) {
	const deleted = await db
		.delete(schema[table])
		.where(await allowedRowWhere(ctx, table, 'delete', id))
		.returning({ id: schema[table].id });
	if (deleted.length === 0) {
		throw apiError('NOT_FOUND', message());
	}
}

/**
 * Refuses with NOT_FOUND when an update through the caller's ability changed no row: pass what the
 * update's `.returning({ id })` gave back.
 */
export function assertUpdated(
	rows: readonly unknown[],
	message: () => string = m.updateNotFoundOrForbidden
) {
	if (rows.length === 0) {
		throw apiError('NOT_FOUND', message());
	}
}

/**
 * The relational query config for the row `id`, as far as the caller's `action` ability reaches:
 * `db.query.x.findFirst(query(await readableById(ctx.abilities.x, id)))`. Takes the table's ability
 * rather than its name because the relational `merge` cannot be typed over a generic table.
 */
export async function readableById<S>(
	ability: {
		filter(
			action: RowAction
		): Promise<{ merge(filter: { where: { id: string } }): { query: { single: S } } }>;
	},
	id: string,
	action: RowAction = 'read'
) {
	return (await ability.filter(action)).merge({ where: { id } }).query.single;
}

/**
 * The `conferenceParticipant` ids of `userIds` in the conference, by user id. Refuses unless every
 * one of them takes part in it (delegate, single participant or supervisor), so writes that name
 * other people by id can use it as their guard and get the rows to point at in one go.
 */
export async function participantIdsOf(
	conferenceId: string,
	userIds: readonly string[]
): Promise<Map<string, string>> {
	const unique = [...new Set(userIds)];
	if (unique.length === 0) return new Map();
	const found = await db.query.conferenceParticipant.findMany({
		where: { conferenceId, userId: { in: unique }, ...conferenceParticipantWithRegistration },
		columns: { id: true, userId: true }
	});
	if (found.length !== unique.length) {
		throw apiError('INVALID_INPUT', m.usersNotInConference());
	}
	return new Map(found.map((row) => [row.userId, row.id]));
}

/**
 * Refuses unless the user is a participant of the conference (`participatesIn`) or on its team.
 * Guards writes about one person that name them by id, such as a participant status. Attendance
 * is narrower: it records participants only (`attendanceEntryPermissions.ts`).
 */
export async function assertParticipantOrTeamMemberIn(conferenceId: string, userId: string) {
	const user = await db.query.user.findFirst({
		where: {
			id: userId,
			OR: [participatesIn({ id: conferenceId }), { teamMember: { conferenceId } }]
		},
		columns: { id: true }
	});
	if (!user) {
		throw apiError('INVALID_INPUT', m.userNotInConference());
	}
}

/**
 * Refuses unless the caller takes part in the conference (delegate, single participant or
 * supervisor), or is a system admin.
 */
export async function assertParticipantOfConference(ctx: Context, conferenceId: string) {
	const caller = ctx.mustBeLoggedIn().sub;
	if (isSystemAdmin(ctx)) return;
	const participant = await db.query.user.findFirst({
		where: { id: caller, ...participatesIn({ id: conferenceId }) },
		columns: { id: true }
	});
	if (!participant) {
		throw apiError('FORBIDDEN', m.accessDeniedParticipant());
	}
}

/**
 * Whether the conference has the role and committee the arguments name, and the role is of one
 * of `roleKinds` (a delegation's by default); an absent one passes. A nation is the conference's
 * while one of its committees seats it, which `setCommitteeNationSeat` keeps its role row for.
 */
export async function offeredIn(
	conferenceId: string,
	ref: { roleId?: string | null; committeeId?: string | null },
	roleKinds: readonly ConferenceRoleKind[] = DELEGATION_ROLE_KINDS
) {
	const [role, committee] = await Promise.all([
		ref.roleId
			? db.query.conferenceRole.findFirst({
					where: { id: ref.roleId, conferenceId, kind: { in: [...roleKinds] } },
					columns: { id: true }
				})
			: true,
		ref.committeeId
			? db.query.committee.findFirst({
					where: { id: ref.committeeId, conferenceId },
					columns: { id: true }
				})
			: true
	]);
	return Boolean(role && committee);
}

/** Refuses a role or committee that the conference does not have. */
export async function assertOfferedIn(
	conferenceId: string,
	ref: Parameters<typeof offeredIn>[1],
	roleKinds?: readonly ConferenceRoleKind[]
) {
	if (!(await offeredIn(conferenceId, ref, roleKinds))) {
		throw apiError('INVALID_INPUT', m.roleNotOnOffer());
	}
}

/** Refuses role ids that are not custom roles of the given conference. */
export async function assertCustomRolesOf(conferenceId: string, roleIds: readonly string[]) {
	const unique = [...new Set(roleIds)];
	if (unique.length === 0) return;
	const roles = await db.query.conferenceRole.findMany({
		where: { id: { in: unique }, conferenceId, kind: 'CUSTOM' },
		columns: { id: true }
	});
	if (roles.length !== unique.length) {
		throw apiError('INVALID_INPUT', m.rolesNotInConference());
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

/** The column that carries a delegation's assignment. */
export const DELEGATION_ASSIGNMENT = { assignedRoleId: false } as const;

/** The column that carries the committee a delegate was seated in. */
export const DELEGATION_MEMBER_ASSIGNMENT = { assignedCommitteeId: false } as const;

/** The column that carries a single participant's assignment. */
export const SINGLE_PARTICIPANT_ASSIGNMENT = { assignedRoleId: false } as const;

/** A participant-side rule that reads the row but not its assignment. */
export function maskedUntilRelease<W extends object, C extends object>(
	filter: W | undefined,
	assignmentColumns: C
) {
	return filter ? { where: filter, columns: assignmentColumns } : undefined;
}

/** The same rule in full, for conferences whose assignment is released. */
export function onceReleased<W extends object>(filter: W | undefined) {
	return filter ? { where: { ...filter, conference: { assignmentReleased: true } } } : undefined;
}
