import { db } from '$api/db/db';
import { abilityBuilder, type ApiContext } from '$api/rumble';
import {
	assertOfferedIn,
	isInOwnDelegation,
	isTeamMemberOfConference,
	PARTICIPANT_CARE_ROLES,
	systemAdmin,
	userId,
	where
} from '$api/services/authHelper';
import { assertFindFirstExists } from '@m1212e/rumble';
import { m } from '$lib/paraglide/messages';
import { apiError } from '$api/services/errors/apiError';

export function registerRoleApplicationAbilities() {
	// Ported from abilities/entities/roleApplication.ts
	abilityBuilder.roleApplication.allow(['read', 'update', 'delete']).when(systemAdmin);

	// Participant care and project management see their conference's applications.
	abilityBuilder.roleApplication.allow('read').when((ctx) => {
		const delegation = isTeamMemberOfConference(ctx, PARTICIPANT_CARE_ROLES);
		return delegation ? { where: { delegation } } : undefined;
	});

	// Delegation members see their own delegation's applications.
	abilityBuilder.roleApplication.allow('read').when((ctx) => where(isInOwnDelegation(ctx)));

	// Only the head delegate may change them, and only until the delegation has applied - the same
	// line the delegation's own update ability draws.
	abilityBuilder.roleApplication.allow(['update', 'delete']).when((ctx) => {
		const id = userId(ctx);
		return id
			? {
					where: {
						delegation: { applied: false, members: { user: { id }, isHeadDelegate: true } }
					}
				}
			: undefined;
	});

	// Supervisors see the applications of the delegations they supervise.
	abilityBuilder.roleApplication.allow('read').when((ctx) => {
		const id = userId(ctx);
		return id
			? { where: { delegation: { members: { supervisors: { user: { id } } } } } }
			: undefined;
	});
}

/**
 * Refuses unless the caller may update the delegation the application belongs to, and the role
 * applied for is on offer in that delegation's conference.
 */
export async function assertCanCreateRoleApplication(
	ctx: ApiContext,
	args: { delegationId: string; nationId?: string | null; nonStateActorId?: string | null }
) {
	const delegation = await db.query.delegation
		.findFirst({
			...(await ctx.abilities.delegation.filter('update')).merge({
				where: { id: args.delegationId }
			}).query.single,
			columns: { conferenceId: true }
		})
		.then(assertFindFirstExists);

	await assertOfferedIn(delegation.conferenceId, {
		assignedNationAlpha3Code: args.nationId,
		assignedNonStateActorId: args.nonStateActorId
	});
}

/**
 * Refuses unless the caller may delete the application (the row's delete ability). Returns it,
 * with the delegation whose ranks close the gap afterwards.
 */
export async function assertCanDeleteRoleApplication(ctx: ApiContext, id: string) {
	const deletable = await db.query.roleApplication.findFirst({
		...(await ctx.abilities.roleApplication.filter('delete')).merge({ where: { id } }).query.single,
		columns: { id: true, delegationId: true }
	});
	if (!deletable) {
		throw apiError('NOT_FOUND', m.deleteNotFoundOrForbidden());
	}
	return deletable;
}

/** Refuses unless the caller may update both applications. Returns them. */
export async function assertCanSwapRoleApplicationRanks(
	ctx: ApiContext,
	firstId: string,
	secondId: string
) {
	const updatable = await ctx.abilities.roleApplication.filter('update');
	return Promise.all([
		db.query.roleApplication
			.findFirst(updatable.merge({ where: { id: firstId } }).query.single)
			.then(assertFindFirstExists),
		db.query.roleApplication
			.findFirst(updatable.merge({ where: { id: secondId } }).query.single)
			.then(assertFindFirstExists)
	]);
}
