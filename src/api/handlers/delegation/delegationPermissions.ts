import { db, schema } from '$api/db/db';
import { abilityBuilder, type ApiContext } from '$api/rumble';
import {
	assertAllowedRow,
	DELEGATION_ASSIGNMENT,
	isTeamMemberOfConference,
	maskedUntilRelease,
	onceReleased,
	PARTICIPANT_CARE_ROLES,
	systemAdmin,
	userId,
	where
} from '$api/services/authHelper';
import type { Context } from '$api/context';
import { assertFindFirstExists } from '@m1212e/rumble';

/** The delegation the caller is a member of. */
function ownDelegation(ctx: Context) {
	const id = userId(ctx);
	return id ? { members: { user: { id } } } : undefined;
}

/** The delegations the caller supervises. */
function supervisedDelegation(ctx: Context) {
	const id = userId(ctx);
	return id ? { members: { supervisors: { user: { id } } } } : undefined;
}

export function registerDelegationAbilities() {
	// Ported from abilities/entities/delegation.ts
	abilityBuilder.delegation.allow(['read', 'update', 'delete']).when(systemAdmin);

	// Delegates see their own delegation, and supervisors the ones they supervise - the assigned
	// nation or non-state actor only once the team has released the assignment.
	abilityBuilder.delegation
		.allow('read')
		.when((ctx) => maskedUntilRelease(ownDelegation(ctx), DELEGATION_ASSIGNMENT));
	abilityBuilder.delegation.allow('read').when((ctx) => onceReleased(ownDelegation(ctx)));
	abilityBuilder.delegation
		.allow('read')
		.when((ctx) => maskedUntilRelease(supervisedDelegation(ctx), DELEGATION_ASSIGNMENT));
	abilityBuilder.delegation.allow('read').when((ctx) => onceReleased(supervisedDelegation(ctx)));

	// The head delegate may change the delegation until it has applied.
	abilityBuilder.delegation.allow(['update', 'delete']).when((ctx) => {
		const id = userId(ctx);
		return id
			? { where: { applied: false, members: { user: { id }, isHeadDelegate: true } } }
			: undefined;
	});

	// Project management and participant care manage their conference's delegations.
	abilityBuilder.delegation
		.allow(['read', 'update'])
		.when((ctx) => where(isTeamMemberOfConference(ctx, PARTICIPANT_CARE_ROLES)));

	// Any team member of the conference may see them - without the join code, which the members,
	// their supervisors and participant care hand out.
	abilityBuilder.delegation.allow('read').when((ctx) => {
		const team = isTeamMemberOfConference(ctx);
		return team ? { where: team, columns: { entryCode: false } } : undefined;
	});
}

/**
 * Refuses unless the caller may update the delegation (the row's update ability). Returns it with
 * its members, conference and role applications, which `updateDelegation` judges it by.
 */
export async function assertCanUpdateDelegation(ctx: ApiContext, id: string) {
	const updatable = (await ctx.abilities.delegation.filter('update')).merge({ where: { id } });
	return db.query.delegation
		.findFirst({
			...updatable.query.single,
			with: { members: true, conference: true, appliedForRoles: true }
		})
		.then(assertFindFirstExists);
}

export type UpdatableDelegation = Awaited<ReturnType<typeof assertCanUpdateDelegation>>;

/** Refuses unless the caller may delete the delegation (the row's delete ability). */
export async function assertCanDeleteDelegation(ctx: ApiContext, id: string) {
	await assertAllowedRow(
		schema.delegation,
		(await ctx.abilities.delegation.filter('delete')).merge({ where: { id } }).sql.where
	);
}
