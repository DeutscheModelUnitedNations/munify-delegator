import { db } from '#api/db/db';
import { abilityBuilder, type ApiContext } from '#api/rumble';
import {
	isTeamMemberOfConference,
	maskedUntilRelease,
	onceReleased,
	PARTICIPANT_CARE_ROLES,
	systemAdmin
} from '#api/services/authHelper/rules';
import { callerUserId, grantWhere } from '#api/services/authHelper/utils';
import type { Context } from '#api/context';
import { assertFindFirstExists } from '@m1212e/rumble';

/** The column masked from participants until release: the delegation's assigned role. */
const DELEGATION_ASSIGNMENT = { assignedRoleId: false } as const;

/** Matches the delegations the caller is a member of. */
function ownDelegation(ctx: Context) {
	const id = callerUserId(ctx);
	return id ? { members: { user: { id } } } : undefined;
}

/** Matches the delegations the caller supervises (any of their members). */
function supervisedDelegation(ctx: Context) {
	const id = callerUserId(ctx);
	return id ? { members: { supervisors: { user: { id } } } } : undefined;
}

export function registerDelegationAbilities() {
	abilityBuilder.delegation.allow(['read', 'update', 'delete']).when(systemAdmin);

	// Delegates read their own delegation, supervisors the ones they supervise; `assignedRoleId`
	// stays masked until the assignment is released.
	abilityBuilder.delegation
		.allow('read')
		.when((ctx) =>
			maskedUntilRelease({ filter: ownDelegation(ctx), assignmentColumns: DELEGATION_ASSIGNMENT })
		);
	abilityBuilder.delegation.allow('read').when((ctx) => onceReleased(ownDelegation(ctx)));
	abilityBuilder.delegation.allow('read').when((ctx) =>
		maskedUntilRelease({
			filter: supervisedDelegation(ctx),
			assignmentColumns: DELEGATION_ASSIGNMENT
		})
	);
	abilityBuilder.delegation.allow('read').when((ctx) => onceReleased(supervisedDelegation(ctx)));

	// The head delegate may update and delete their delegation until it has applied.
	abilityBuilder.delegation.allow(['update', 'delete']).when((ctx) => {
		const id = callerUserId(ctx);
		return id
			? { where: { applied: false, members: { user: { id }, isHeadDelegate: true } } }
			: undefined;
	});

	// Participant care (project management and participant care) reads, updates and deletes the
	// delegations of its conference, applied or not.
	abilityBuilder.delegation
		.allow(['read', 'update', 'delete'])
		.when((ctx) => grantWhere(isTeamMemberOfConference({ ctx, roles: PARTICIPANT_CARE_ROLES })));

	// Every team member reads the delegations of their conference, without `entryCode`: only the
	// members, their supervisors and participant care hand out the join code.
	abilityBuilder.delegation.allow('read').when((ctx) => {
		const team = isTeamMemberOfConference({ ctx });
		return team ? { where: team, columns: { entryCode: false } } : undefined;
	});
}

/**
 * Refuses (NOT_FOUND) unless the caller's update ability reaches the delegation. Returns it with
 * its members, conference and role applications, which `updateDelegation` judges the change by.
 */
export async function assertCanUpdateDelegation({ ctx, id }: { ctx: ApiContext; id: string }) {
	const updatable = (await ctx.abilities.delegation.filter('update')).merge({ where: { id } });
	return db.query.delegation
		.findFirst({
			...updatable.query.single,
			with: {
				members: { with: { participant: { columns: { userId: true } } } },
				conference: true,
				appliedForRoles: true
			}
		})
		.then(assertFindFirstExists);
}

export type UpdatableDelegation = Awaited<ReturnType<typeof assertCanUpdateDelegation>>;
