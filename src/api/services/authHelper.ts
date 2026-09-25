import { db } from '$api/db/db';
import type { Context } from '$api/context';
import { GraphQLError } from 'graphql';
import type { teamRole } from '$api/db/schema';

/** The TeamRole enum values, taken from the schema so role lists stay type-checked. */
export type TeamRole = (typeof teamRole.enumValues)[number];

/**
 * Shared authorization filters, mirroring munify-chase's `authHelper.ts`.
 *
 * Each helper returns a Drizzle relational `where` shape for
 * `abilityBuilder.<table>.allow(...).when((ctx) => ({ where: ... }))`, or `undefined` when the
 * rule grants nothing for this request.
 *
 * Two translation rules carried over from the CASL layer these replace:
 *
 * - Prisma's `some:` for a to-many relation has no Drizzle equivalent; a nested relation object
 *   already means "a related row matches". So `{ teamMembers: { some: { user: { id } } } }`
 *   becomes `{ teamMembers: { user: { id } } }`. Verified to compile to an EXISTS subquery.
 * - CASL registered its rules inside `if (oidc?.user)`, so an anonymous request simply matched
 *   no rule and got an empty result. These helpers therefore return `undefined` rather than
 *   calling `mustBeLoggedIn()`, which would turn that empty result into a thrown error.
 *
 * An empty object `{}` means "no restriction", which is how system admins get the wildcard the
 * CASL layer expressed as `can('manage', 'all')`.
 */

export const PARTICIPANT_CARE_ROLES = [
	'PROJECT_MANAGEMENT',
	'PARTICIPANT_CARE'
] as const satisfies readonly TeamRole[];

export const TEAM_ADMIN_ROLES = [
	'PROJECT_MANAGEMENT',
	'TEAM_COORDINATOR'
] as const satisfies readonly TeamRole[];

/**
 * Mirrors the CASL layer's `can('manage', 'all')`. Rumble has no global wildcard, so every
 * handler applies this to its own table - otherwise a system admin would silently lose access
 * to any table whose other rules do not happen to match them.
 */
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
	if (conference === undefined) return undefined;
	return { conference };
}

/** Matches rows belonging to the logged-in user through a `user` relation. */
export function isOwnUser(ctx: Context) {
	if (isSystemAdmin(ctx)) return {};
	const id = userId(ctx);
	if (!id) return undefined;
	return { user: { id } };
}

/**
 * Creation cannot be expressed as an ability filter - there is no row to filter on yet - so the
 * legacy resolvers checked team membership inline before inserting. This is that check, shared
 * by the handlers that create conference-scoped rows.
 */
export async function assertMayManageConference(
	conferenceId: string,
	callerId: string | undefined,
	roles: readonly TeamRole[] = PARTICIPANT_CARE_ROLES,
	/**
	 * Whether a system admin who is not on the conference team passes anyway. Off by default
	 * because most legacy create resolvers checked team membership only - `createOneTeamMember`
	 * is the one that also accepted the admin role, so only it opts in.
	 */
	options?: { allowSystemAdmin?: boolean; ctx?: Context }
) {
	if (!callerId) {
		throw new GraphQLError('Must be logged in');
	}
	if (options?.allowSystemAdmin && options.ctx && isSystemAdmin(options.ctx)) {
		return;
	}
	const member = await db.query.teamMember.findFirst({
		where: { conferenceId, userId: callerId, role: { in: [...roles] } }
	});
	if (!member) {
		throw new GraphQLError(`Access denied - requires one of: ${roles.join(', ')}`);
	}
}

/** Same check, for rows that reach their conference through a calendar day. */
export async function assertMayManageCalendarDay(
	calendarDayId: string,
	callerId: string | undefined
) {
	const day = await db.query.calendarDay.findFirst({
		where: { id: calendarDayId },
		columns: { conferenceId: true }
	});
	if (!day) {
		throw new GraphQLError('Calendar day not found');
	}
	await assertMayManageConference(day.conferenceId, callerId);
}

/** Same check, for rows that reach their conference through a survey question. */
export async function assertMayManageSurveyQuestion(
	questionId: string,
	callerId: string | undefined
) {
	const question = await db.query.surveyQuestion.findFirst({
		where: { id: questionId },
		columns: { conferenceId: true }
	});
	if (!question) {
		throw new GraphQLError('Survey question not found');
	}
	await assertMayManageConference(question.conferenceId, callerId);
}
