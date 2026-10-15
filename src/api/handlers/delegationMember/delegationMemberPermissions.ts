import { db, schema } from '$api/db/db';
import { abilityBuilder, type ApiContext } from '$api/rumble';
import {
	assertAllowedRow,
	assertOfferedIn,
	assertTeamRole,
	DELEGATION_MEMBER_ASSIGNMENT,
	isInOwnDelegation,
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
import { m } from '$lib/paraglide/messages';
import { apiError } from '$api/services/errors/apiError';

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
	await assertAllowedRow(
		schema.delegationMember,
		(await ctx.abilities.delegationMember.filter('delete')).merge({ where: { id } }).sql.where
	);
}

/** The role a user is placed into has to be one the conference offers. */
export { assertOfferedIn };

/** Placing a user straight into an assigned delegation is participant care's. */
export async function assertCanCreateAppliedDelegationMember(
	ctx: ApiContext,
	conferenceId: string
) {
	await assertTeamRole(ctx, conferenceId, PARTICIPANT_CARE_ROLES);
}

/**
 * Refuses unless the caller may update the delegate (the row's update ability) and the committee
 * is one of the delegate's own conference, not any committee id at all. Returns both, the member
 * with its delegation's members, which the move needs to find a seat.
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
		.findFirst({ where: { id: assignedCommitteeId, conferenceId: member.delegation.conferenceId } })
		.then(assertFindFirstExists);

	return { member, committee };
}

export type CommitteeMove = Awaited<ReturnType<typeof assertCanMoveDelegationMemberToCommittee>>;

/**
 * Refuses a committee that is not one of the conference's (null clears the assignment, and needs
 * no check). Returns the where-clause matching the conference's delegates the caller may update,
 * which scopes the bulk write.
 */
export async function authorizeDelegationMemberCommitteeMoves(
	ctx: ApiContext,
	conferenceId: string,
	assignedCommitteeId: string | null | undefined
) {
	if (assignedCommitteeId) {
		await db.query.committee
			.findFirst({ where: { id: assignedCommitteeId, conferenceId } })
			.then(assertFindFirstExists);
	}

	return (await ctx.abilities.delegationMember.filter('update')).merge({
		where: { participant: { conferenceId } }
	}).sql.where;
}

/**
 * Checks every pairing of the assignment assistant before anything is written: the caller may
 * update the delegate, the committee belongs to the same conference as the delegate, and it
 * actually seats the delegation's assigned nation. Checked in order, one pairing after the other,
 * so the first bad pairing decides the error.
 */
export async function assertCanAssignCommittees(
	ctx: ApiContext,
	assignments: { delegationMemberId: string; committeeId: string }[]
) {
	const updatable = await ctx.abilities.delegationMember.filter('update');

	for (const assignment of assignments) {
		const committee = await db.query.committee
			.findFirst({
				where: { id: assignment.committeeId },
				with: { roles: { columns: { id: true } } }
			})
			.then(assertFindFirstExists);

		const member = await db.query.delegationMember
			.findFirst({
				...updatable.merge({ where: { id: assignment.delegationMemberId } }).query.single,
				with: { delegation: true }
			})
			.then(assertFindFirstExists);

		if (committee.conferenceId !== member.delegation.conferenceId) {
			throw apiError('INVALID_INPUT', m.committeeDoesNotBelongToConferenceError());
		}

		const roleId = member.delegation?.assignedRoleId;
		if (!committee.roles.some((role) => role.id === roleId)) {
			throw apiError('INVALID_INPUT', m.committeeDoesNotBelongToConferenceError());
		}
	}
}
