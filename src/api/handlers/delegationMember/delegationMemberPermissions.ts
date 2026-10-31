import { db } from '#api/db/db';
import { abilityBuilder, type ApiContext } from '#api/rumble';
import {
	assertOfferedIn,
	assertTeamPermission,
	isInOwnDelegation,
	isTeamMemberOfConference,
	maskedUntilRelease,
	onceReleased,
	PARTICIPANT_CARE_ROLES,
	systemAdmin
} from '#api/services/authHelper/rules';
import { callerUserId, grantWhere, assertAllowed } from '#api/services/authHelper/utils';
import type { Context } from '#api/context';
import { assertFindFirstExists } from '@m1212e/rumble';
import { m } from '#lib/paraglide/messages';
import { apiError } from '#api/services/errors';

/** The column that carries the committee a delegate was seated in (`maskedUntilRelease`). */
const DELEGATION_MEMBER_ASSIGNMENT = { assignedCommitteeId: false } as const;

/** The delegates of the delegations the caller supervises. */
function supervisedMember(ctx: Context) {
	const id = callerUserId(ctx);
	return id ? { delegation: { members: { supervisors: { user: { id } } } } } : undefined;
}

export function registerDelegationMemberAbilities() {
	// Ported from abilities/entities/delegationMember.ts
	abilityBuilder.delegationMember.allow(['read', 'update', 'delete']).when(systemAdmin);

	// Co-delegates see each other, and supervisors the delegates they supervise - the committee they
	// were seated in only once the team has released the assignment.
	abilityBuilder.delegationMember.allow('read').when((ctx) =>
		maskedUntilRelease({
			filter: isInOwnDelegation(ctx),
			assignmentColumns: DELEGATION_MEMBER_ASSIGNMENT
		})
	);
	abilityBuilder.delegationMember.allow('read').when((ctx) => onceReleased(isInOwnDelegation(ctx)));
	abilityBuilder.delegationMember.allow('read').when((ctx) =>
		maskedUntilRelease({
			filter: supervisedMember(ctx),
			assignmentColumns: DELEGATION_MEMBER_ASSIGNMENT
		})
	);
	abilityBuilder.delegationMember.allow('read').when((ctx) => onceReleased(supervisedMember(ctx)));

	// Project management and participant care manage their conference's delegation members.
	abilityBuilder.delegationMember
		.allow(['read', 'update', 'delete'])
		.when((ctx) => grantWhere(isTeamMemberOfConference({ ctx, roles: PARTICIPANT_CARE_ROLES })));

	// Only the head delegate may remove a delegate, and only before the delegation has applied.
	abilityBuilder.delegationMember.allow('delete').when((ctx) => {
		const id = callerUserId(ctx);
		return id
			? {
					where: {
						delegation: { applied: false, members: { isHeadDelegate: true, user: { id } } }
					}
				}
			: undefined;
	});

	// Anyone may leave a delegation that has not applied yet.
	abilityBuilder.delegationMember.allow('delete').when((ctx) => {
		const id = callerUserId(ctx);
		return id ? { where: { user: { id }, delegation: { applied: false } } } : undefined;
	});

	// The head delegate may edit members who have no committee assigned yet.
	abilityBuilder.delegationMember.allow('update').when((ctx) => {
		const id = callerUserId(ctx);
		return id
			? {
					where: {
						assignedCommitteeId: { isNull: true },
						delegation: { members: { isHeadDelegate: true, user: { id } } }
					}
				}
			: undefined;
	});
}

/** Refuses unless the caller may remove the delegate (the row's delete ability). */
export async function assertCanDeleteDelegationMember({
	ctx,
	id
}: {
	ctx: ApiContext;
	id: string;
}) {
	await assertAllowed({ ctx, table: 'delegationMember', action: 'delete', id });
}

/** The role a user is placed into has to be one the conference offers. */
export { assertOfferedIn };

/** Placing a user straight into an assigned delegation is participant care's. */
export async function assertCanCreateAppliedDelegationMember({
	ctx,
	conferenceId
}: {
	ctx: ApiContext;
	conferenceId: string;
}) {
	await assertTeamPermission({ ctx, conferenceId, permission: 'manageParticipants' });
}

/**
 * Refuses a committee that does not seat the delegation's assigned role: a delegate can only sit
 * where their delegation has a seat, and a delegation without a role has none.
 */
function assertCommitteeSeats({
	committee,
	assignedRoleId
}: {
	committee: { roles: { id: string }[] };
	assignedRoleId: string | null | undefined;
}) {
	if (!assignedRoleId || !committee.roles.some((role) => role.id === assignedRoleId)) {
		throw apiError({ code: 'INVALID_INPUT', message: m.committeeDoesNotBelongToConferenceError() });
	}
}

/**
 * Refuses unless the caller may update the delegate (the row's update ability) and the committee
 * is one of the delegate's own conference that seats their delegation, not any committee id at
 * all. Returns both, the member with its delegation's members, which the move needs to find a
 * seat.
 */
export async function assertCanMoveDelegationMemberToCommittee({
	ctx,
	id,
	assignedCommitteeId
}: {
	ctx: ApiContext;
	id: string;
	assignedCommitteeId: string;
}) {
	const member = await db.query.delegationMember
		.findFirst({
			...(await ctx.abilities.delegationMember.filter('update')).merge({ where: { id } }).query
				.single,
			with: { delegation: { with: { members: true } } }
		})
		.then(assertFindFirstExists);

	const committee = await db.query.committee
		.findFirst({
			where: { id: assignedCommitteeId, conferenceId: member.delegation.conferenceId },
			with: { roles: { columns: { id: true } } }
		})
		.then(assertFindFirstExists);
	assertCommitteeSeats({ committee, assignedRoleId: member.delegation.assignedRoleId });

	return { member, committee };
}

export type CommitteeMove = Awaited<ReturnType<typeof assertCanMoveDelegationMemberToCommittee>>;

/**
 * Checks every pairing of a committee assignment before anything is written: the caller may
 * update each delegate, they are all of the conference, and every committee named is the
 * conference's and seats the delegate's delegation. A null committee clears the assignment, which
 * only needs the update.
 */
export async function assertCanAssignCommittees({
	ctx,
	conferenceId,
	assignments
}: {
	ctx: ApiContext;
	conferenceId: string;
	assignments: { delegationMemberId: string; committeeId?: string | null }[];
}) {
	const memberIds = [...new Set(assignments.map((a) => a.delegationMemberId))];
	const committeeIds = [...new Set(assignments.flatMap((a) => a.committeeId ?? []))];
	const updatable = await ctx.abilities.delegationMember.filter('update');

	const [members, committees] = await Promise.all([
		db.query.delegationMember.findMany({
			...updatable.merge({ where: { id: { in: memberIds }, participant: { conferenceId } } }).query
				.many,
			columns: { id: true },
			with: { delegation: { columns: { assignedRoleId: true } } }
		}),
		db.query.committee.findMany({
			where: { id: { in: committeeIds } },
			columns: { id: true, conferenceId: true },
			with: { roles: { columns: { id: true } } }
		})
	]);
	if (members.length !== memberIds.length) {
		throw apiError({ code: 'NOT_FOUND', message: m.updateNotFoundOrForbidden() });
	}
	const memberById = new Map(members.map((member) => [member.id, member]));
	const committeeById = new Map(committees.map((committee) => [committee.id, committee]));

	for (const assignment of assignments) {
		if (!assignment.committeeId) continue;
		const committee = committeeById.get(assignment.committeeId);
		if (!committee) {
			throw apiError({ code: 'NOT_FOUND', message: m.updateNotFoundOrForbidden() });
		}
		if (committee.conferenceId !== conferenceId) {
			throw apiError({
				code: 'INVALID_INPUT',
				message: m.committeeDoesNotBelongToConferenceError()
			});
		}
		assertCommitteeSeats({
			committee,
			assignedRoleId: memberById.get(assignment.delegationMemberId)?.delegation.assignedRoleId
		});
	}
}

/**
 * Switching seats is participant care's, like placing someone (`createAppliedDelegationMember`).
 * Every member the switch names - the one moving, the one swapped with, the chosen head delegates -
 * has to be a delegate of the conference the caller may update, and the target role and committee
 * the conference's.
 */
export async function assertCanSwitchDelegationMemberSeats({
	ctx,
	args
}: {
	ctx: ApiContext;
	args: {
		conferenceId: string;
		memberId: string;
		otherMemberId?: string | null;
		targetRoleId?: string | null;
		targetCommitteeId?: string | null;
		headDelegateMemberIds?: readonly string[] | null;
	};
}) {
	const { conferenceId } = args;
	await assertTeamPermission({ ctx, conferenceId, permission: 'manageParticipants' });
	await assertOfferedIn({
		conferenceId,
		ref: {
			roleId: args.targetRoleId,
			committeeId: args.targetCommitteeId
		}
	});

	const memberIds = [
		...new Set([args.memberId, args.otherMemberId ?? [], args.headDelegateMemberIds ?? []].flat())
	];
	const members = await db.query.delegationMember.findMany({
		...(await ctx.abilities.delegationMember.filter('update')).merge({
			where: { id: { in: memberIds }, participant: { conferenceId } }
		}).query.many,
		columns: { id: true }
	});
	if (members.length !== memberIds.length) {
		throw apiError({ code: 'NOT_FOUND', message: m.updateNotFoundOrForbidden() });
	}
}
