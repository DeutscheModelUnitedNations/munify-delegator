import { db } from '#api/db/db';
import { abilityBuilder, type ApiContext } from '#api/rumble';
import {
	assertOfferedIn,
	isInOwnDelegation,
	isTeamMemberOfConference,
	PARTICIPANT_CARE_ROLES,
	systemAdmin
} from '#api/services/authHelper/rules';
import { callerUserId, grantWhere } from '#api/services/authHelper/utils';
import { assertFindFirstExists } from '@m1212e/rumble';
import { m } from '#lib/paraglide/messages';
import { apiError } from '#api/services/errors';

export function registerRoleApplicationAbilities() {
	abilityBuilder.roleApplication.allow(['read', 'update', 'delete']).when(systemAdmin);

	// Delegates read their own delegation's role applications.
	abilityBuilder.roleApplication.allow('read').when((ctx) => grantWhere(isInOwnDelegation(ctx)));

	// The head delegate may update and delete their delegation's role applications until it has
	// applied - the same line the delegation's own update ability draws.
	abilityBuilder.roleApplication.allow(['update', 'delete']).when((ctx) => {
		const id = callerUserId(ctx);
		return id
			? {
					where: {
						delegation: { applied: false, members: { user: { id }, isHeadDelegate: true } }
					}
				}
			: undefined;
	});

	// Participant care (project management and participant care) reads, updates and deletes the role
	// applications of its conference, also after the delegation applied, as it may the delegation.
	abilityBuilder.roleApplication.allow(['read', 'update', 'delete']).when((ctx) => {
		const delegation = isTeamMemberOfConference({ ctx, roles: PARTICIPANT_CARE_ROLES });
		return delegation ? { where: { delegation } } : undefined;
	});

	// Supervisors read the role applications of the delegations they supervise.
	abilityBuilder.roleApplication.allow('read').when((ctx) => {
		const id = callerUserId(ctx);
		return id
			? { where: { delegation: { members: { supervisors: { user: { id } } } } } }
			: undefined;
	});
}

/**
 * Refuses unless the caller's update ability reaches the delegation (so the head delegate before
 * applying, or participant care) and the role is on offer in its conference.
 */
export async function assertCanCreateRoleApplication({
	ctx,
	args
}: {
	ctx: ApiContext;
	args: { delegationId: string; roleId: string };
}) {
	const delegation = await db.query.delegation
		.findFirst({
			...(await ctx.abilities.delegation.filter('update')).merge({
				where: { id: args.delegationId }
			}).query.single,
			columns: { conferenceId: true }
		})
		.then(assertFindFirstExists);

	await assertOfferedIn({ conferenceId: delegation.conferenceId, ref: { roleId: args.roleId } });
}

/**
 * Refuses (NOT_FOUND) unless the caller's delete ability reaches the role application. Returns its
 * id and delegation, whose ranks close the gap afterwards.
 */
export async function assertCanDeleteRoleApplication({ ctx, id }: { ctx: ApiContext; id: string }) {
	const deletable = await db.query.roleApplication.findFirst({
		...(await ctx.abilities.roleApplication.filter('delete')).merge({ where: { id } }).query.single,
		columns: { id: true, delegationId: true }
	});
	if (!deletable) {
		throw apiError({ code: 'NOT_FOUND', message: m.deleteNotFoundOrForbidden() });
	}
	return deletable;
}

/**
 * Refuses unless the caller's update ability reaches both role applications and they belong to one
 * delegation. Returns them.
 */
export async function assertCanSwapRoleApplicationRanks({
	ctx,
	firstId,
	secondId
}: {
	ctx: ApiContext;
	firstId: string;
	secondId: string;
}) {
	const updatable = await ctx.abilities.roleApplication.filter('update');
	const [first, second] = await Promise.all([
		db.query.roleApplication
			.findFirst(updatable.merge({ where: { id: firstId } }).query.single)
			.then(assertFindFirstExists),
		db.query.roleApplication
			.findFirst(updatable.merge({ where: { id: secondId } }).query.single)
			.then(assertFindFirstExists)
	]);
	if (first.delegationId !== second.delegationId) {
		throw apiError({ code: 'INVALID_INPUT', message: m.roleApplicationsOfDifferentDelegations() });
	}
	return { first, second };
}
