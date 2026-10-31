import { db } from '#api/db/db';
import { abilityBuilder, type ApiContext } from '#api/rumble';
import {
	assertTeamPermission,
	hasTeamPermission,
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

/** The column masked from participants until release: the committee a delegate was seated in. */
const DELEGATION_MEMBER_ASSIGNMENT = { assignedCommitteeId: false } as const;

/** Matches the members of delegations the caller supervises (any of their members). */
function supervisedMember(ctx: Context) {
	const id = callerUserId(ctx);
	return id ? { delegation: { members: { supervisors: { user: { id } } } } } : undefined;
}

export function registerDelegationMemberAbilities() {
	abilityBuilder.delegationMember.allow(['read', 'update', 'delete']).when(systemAdmin);

	// Delegates read the members of their own delegation, supervisors those of the delegations they
	// supervise; `assignedCommitteeId` stays masked until the assignment is released.
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

	// Participant care (project management and participant care) reads, updates and deletes the
	// delegation members of its conference.
	abilityBuilder.delegationMember
		.allow(['read', 'update', 'delete'])
		.when((ctx) => grantWhere(isTeamMemberOfConference({ ctx, roles: PARTICIPANT_CARE_ROLES })));

	// The head delegate may remove members of their delegation until it has applied.
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

	// A delegate may delete their own membership (leave) until the delegation has applied.
	abilityBuilder.delegationMember.allow('delete').when((ctx) => {
		const id = callerUserId(ctx);
		return id ? { where: { user: { id }, delegation: { applied: false } } } : undefined;
	});

	// The head delegate may seat the members of their delegation who have no committee yet, once the
	// assignment is released: the committee checks test against the delegation's role, which would
	// reveal it before then.
	abilityBuilder.delegationMember.allow('update').when((ctx) => {
		const id = callerUserId(ctx);
		return id
			? {
					where: {
						assignedCommitteeId: { isNull: true },
						conference: { assignmentReleased: true },
						delegation: { members: { isHeadDelegate: true, user: { id } } }
					}
				}
			: undefined;
	});
}

/**
 * Refuses (NOT_FOUND) unless the caller's delete ability reaches the delegation member: the member
 * themselves or their head delegate until the delegation has applied, or `manageParticipants`
 * (project management and participant care) in its conference at any time.
 */
export async function assertCanDeleteDelegationMember({
	ctx,
	id
}: {
	ctx: ApiContext;
	id: string;
}) {
	await assertAllowed({ ctx, table: 'delegationMember', action: 'delete', id });
}

/**
 * Refuses (INVALID_INPUT) a committee that does not seat the delegation's assigned role: a delegate
 * can only sit where their delegation has a seat, and a delegation without a role has none.
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
 * Refuses unless the caller holds `manageParticipants` (project management and participant care) in
 * the conference, who place a user straight into an assigned delegation, and the committee, if any,
 * is one of its committees that seats the role (INVALID_INPUT otherwise). The role being a nation
 * or non-state actor of the conference is the database's check (`conference_role_kind`).
 */
export async function assertCanCreateAppliedDelegationMember({
	ctx,
	args
}: {
	ctx: ApiContext;
	args: { conferenceId: string; assignedRoleId: string; assignedCommitteeId?: string | null };
}) {
	const { conferenceId, assignedRoleId, assignedCommitteeId } = args;
	await assertTeamPermission({ ctx, conferenceId, permission: 'manageParticipants' });
	if (!assignedCommitteeId) return;
	const committee = await db.query.committee.findFirst({
		where: { id: assignedCommitteeId, conferenceId },
		columns: { id: true },
		with: { roles: { columns: { id: true } } }
	});
	if (!committee) {
		throw apiError({ code: 'INVALID_INPUT', message: m.committeeDoesNotBelongToConferenceError() });
	}
	assertCommitteeSeats({ committee, assignedRoleId });
}

/**
 * Refuses (NOT_FOUND) unless the caller's update ability reaches the delegation member: their head
 * delegate once the assignment is released and while the member has no committee, or
 * `manageParticipants` (project management and participant care) in its conference. Refuses
 * (INVALID_INPUT) a committee that is not one of the conference's seating the delegation. Returns
 * the member with its delegation's members, the committee, and whether the caller may displace a
 * seated member when the committee is full: only participant care may, a head delegate seats
 * nobody out of a seat the team gave.
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

	const mayDisplace = await hasTeamPermission({
		ctx,
		conferenceId: member.delegation.conferenceId,
		permission: 'manageParticipants'
	});
	return { member, committee, mayDisplace };
}

export type CommitteeMove = Awaited<ReturnType<typeof assertCanMoveDelegationMemberToCommittee>>;

/**
 * Refuses unless, for every pairing, the caller's update ability reaches the delegation member
 * (NOT_FOUND; see `assertCanMoveDelegationMemberToCommittee` for who has it), the member is of
 * `conferenceId`, and the committee (if any) seats the member's delegation (INVALID_INPUT), which
 * makes it the conference's. Checked before anything is written; a null committee only clears the
 * seat.
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
			columns: { id: true },
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
		assertCommitteeSeats({
			committee,
			assignedRoleId: memberById.get(assignment.delegationMemberId)?.delegation.assignedRoleId
		});
	}
}

/**
 * Refuses unless the caller holds `manageParticipants` (project management and participant care) in
 * the conference and every member the switch names (the one moving, the one swapped with, the new
 * head delegates) is one of the conference's that the caller may update (NOT_FOUND). The target
 * role and committee are looked up within the conference by `switchSeats`.
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
