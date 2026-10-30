import { db } from '#api/db/db';
import { abilityBuilder, type ApiContext } from '#api/rumble';
import {
	assertOfferedIn,
	assertTeamPermission,
	DELEGATION_MEMBER_ASSIGNMENT,
	isInOwnDelegation,
	isTeamMemberOfConference,
	maskedUntilRelease,
	onceReleased,
	PARTICIPANT_CARE_ROLES,
	systemAdmin,
	userId,
	where,
	assertAllowedById
} from '#api/services/authHelper';
import type { Context } from '#api/context';
import { assertFindFirstExists } from '@m1212e/rumble';
import { m } from '#lib/paraglide/messages';
import { apiError } from '#api/services/errors/apiError';

/** The delegates of the delegations the caller supervises. */
function supervisedMember(ctx: Context) {
	const id = userId(ctx);
	return id ? { delegation: { members: { supervisors: { user: { id } } } } } : undefined;
}

export function registerDelegationMemberAbilities() {
	// Ported from abilities/entities/delegationMember.ts
	abilityBuilder.delegationMember.allow(['read', 'update', 'delete']).when(systemAdmin);

	// Co-delegates see each other, and supervisors the delegates they supervise - the committee they
	// were seated in only once the team has released the assignment.
	abilityBuilder.delegationMember
		.allow('read')
		.when((ctx) => maskedUntilRelease(isInOwnDelegation(ctx), DELEGATION_MEMBER_ASSIGNMENT));
	abilityBuilder.delegationMember.allow('read').when((ctx) => onceReleased(isInOwnDelegation(ctx)));
	abilityBuilder.delegationMember
		.allow('read')
		.when((ctx) => maskedUntilRelease(supervisedMember(ctx), DELEGATION_MEMBER_ASSIGNMENT));
	abilityBuilder.delegationMember.allow('read').when((ctx) => onceReleased(supervisedMember(ctx)));

	// Project management and participant care manage their conference's delegation members.
	abilityBuilder.delegationMember
		.allow(['read', 'update', 'delete'])
		.when((ctx) => where(isTeamMemberOfConference(ctx, PARTICIPANT_CARE_ROLES)));

	// Only the head delegate may remove a delegate, and only before the delegation has applied.
	abilityBuilder.delegationMember.allow('delete').when((ctx) => {
		const id = userId(ctx);
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
		const id = userId(ctx);
		return id ? { where: { user: { id }, delegation: { applied: false } } } : undefined;
	});

	// The head delegate may edit members who have no committee assigned yet.
	abilityBuilder.delegationMember.allow('update').when((ctx) => {
		const id = userId(ctx);
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
export async function assertCanDeleteDelegationMember(ctx: ApiContext, id: string) {
	await assertAllowedById(ctx, 'delegationMember', 'delete', id);
}

/** The role a user is placed into has to be one the conference offers. */
export { assertOfferedIn };

/** Placing a user straight into an assigned delegation is participant care's. */
export async function assertCanCreateAppliedDelegationMember(
	ctx: ApiContext,
	conferenceId: string
) {
	await assertTeamPermission(ctx, conferenceId, 'manageParticipants');
}

/**
 * Refuses a committee that does not seat the delegation's assigned role: a delegate can only sit
 * where their delegation has a seat, and a delegation without a role has none.
 */
function assertCommitteeSeats(
	committee: { roles: { id: string }[] },
	assignedRoleId: string | null | undefined
) {
	if (!assignedRoleId || !committee.roles.some((role) => role.id === assignedRoleId)) {
		throw apiError('INVALID_INPUT', m.committeeDoesNotBelongToConferenceError());
	}
}

/**
 * Refuses unless the caller may update the delegate (the row's update ability) and the committee
 * is one of the delegate's own conference that seats their delegation, not any committee id at
 * all. Returns both, the member with its delegation's members, which the move needs to find a
 * seat.
 */
export async function assertCanMoveDelegationMemberToCommittee(
	ctx: ApiContext,
	id: string,
	assignedCommitteeId: string
) {
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
	assertCommitteeSeats(committee, member.delegation.assignedRoleId);

	return { member, committee };
}

export type CommitteeMove = Awaited<ReturnType<typeof assertCanMoveDelegationMemberToCommittee>>;

/**
 * Checks every pairing of a committee assignment before anything is written: the caller may
 * update each delegate, they are all of the conference, and every committee named is the
 * conference's and seats the delegate's delegation. A null committee clears the assignment, which
 * only needs the update.
 */
export async function assertCanAssignCommittees(
	ctx: ApiContext,
	conferenceId: string,
	assignments: { delegationMemberId: string; committeeId?: string | null }[]
) {
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
		throw apiError('NOT_FOUND', m.updateNotFoundOrForbidden());
	}
	const memberById = new Map(members.map((member) => [member.id, member]));
	const committeeById = new Map(committees.map((committee) => [committee.id, committee]));

	for (const assignment of assignments) {
		if (!assignment.committeeId) continue;
		const committee = committeeById.get(assignment.committeeId);
		if (!committee) {
			throw apiError('NOT_FOUND', m.updateNotFoundOrForbidden());
		}
		if (committee.conferenceId !== conferenceId) {
			throw apiError('INVALID_INPUT', m.committeeDoesNotBelongToConferenceError());
		}
		assertCommitteeSeats(
			committee,
			memberById.get(assignment.delegationMemberId)?.delegation.assignedRoleId
		);
	}
}
