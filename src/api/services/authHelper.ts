import type { Context } from '$api/context';

/**
 * Shared authorization filters, mirroring munify-chase's `authHelper.ts`.
 *
 * Each helper returns a Drizzle relational `where` shape for use in
 * `abilityBuilder.<table>.allow(...).when((ctx) => ({ where: ... }))`.
 *
 * Translating the CASL rules these replace: Prisma's `some:` for a to-many relation has no
 * Drizzle equivalent - a nested relation object already means "a related row matches" - so
 * `{ teamMembers: { some: { user: { id } } } }` becomes `{ teamMembers: { user: { id } } }`.
 * An empty object `{}` means "no restriction", which is how system admins are granted the
 * wildcard the CASL layer expressed as `can('manage', 'all')`.
 */

export const PARTICIPANT_CARE_ROLES = ['PROJECT_MANAGEMENT', 'PARTICIPANT_CARE'] as const;

/** System-wide admin, via the OIDC role claim. */
export function isSystemAdmin(ctx: Context) {
	return ctx.hasRole('admin');
}

/** The logged-in user's id, or undefined for anonymous requests. */
export function userId(ctx: Context) {
	return ctx.oidc.user?.sub;
}

/** Matches rows whose `conference` has the user on its team, optionally with given roles. */
export function isTeamMemberOfConference(ctx: Context, roles?: readonly string[]) {
	if (isSystemAdmin(ctx)) return {};
	const id = ctx.mustBeLoggedIn().sub;
	return {
		conference: {
			teamMembers: roles ? { user: { id }, role: { in: [...roles] } } : { user: { id } }
		}
	};
}

/** Matches a Conference row directly (not via a `conference` relation). */
export function isTeamMemberOf(ctx: Context, roles?: readonly string[]) {
	if (isSystemAdmin(ctx)) return {};
	const id = ctx.mustBeLoggedIn().sub;
	return {
		teamMembers: roles ? { user: { id }, role: { in: [...roles] } } : { user: { id } }
	};
}

/** Matches rows belonging to the logged-in user via a `user` relation. */
export function isOwnUser(ctx: Context) {
	if (isSystemAdmin(ctx)) return {};
	const id = ctx.mustBeLoggedIn().sub;
	return { user: { id } };
}

/** Matches rows whose `user` is supervised by the logged-in user. */
export function isSupervisedUser(ctx: Context) {
	if (isSystemAdmin(ctx)) return {};
	const id = ctx.mustBeLoggedIn().sub;
	return {
		user: {
			OR: [
				{ delegationMemberships: { supervisors: { user: { id } } } },
				{ singleParticipant: { supervisors: { user: { id } } } }
			]
		}
	};
}
