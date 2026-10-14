import { db } from '$api/db/db';
import { abilityBuilder, object, query, schemaBuilder } from '$api/rumble';
import {
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
import { countGiven } from '$api/services/args';
import type { Context } from '$api/context';
import {
	assertOfferedIn,
	assignCommittees,
	joinDelegationByEntryCode,
	moveManyMembersToCommittee,
	moveMemberToCommittee,
	placeUserInAssignedDelegation,
	removeDelegationMember
} from './delegationMemberService';
import { assertFindFirstExists } from '@m1212e/rumble';
import {
	delegationMemberPubsub,
	delegationPubsub,
	singleParticipantPubsub,
	waitingListEntryPubsub
} from '$api/pubsub';
import { m } from '$lib/paraglide/messages';
import { apiError } from '$api/services/apiError';

// Ported from abilities/entities/delegationMember.ts
abilityBuilder.delegationMember.allow(['read', 'update', 'delete']).when(systemAdmin);

/** The delegates of the delegations the caller supervises. */
function supervisedMember(ctx: Context) {
	const id = userId(ctx);
	return id ? { delegation: { members: { supervisors: { user: { id } } } } } : undefined;
}

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

const DelegationMemberRef = object({ table: 'delegationMember' });
query({ table: 'delegationMember' });
schemaBuilder.mutationFields((t) => ({
	/** Joining a delegation by entry code. */
	createDelegationMember: t.drizzleField({
		type: DelegationMemberRef,
		args: {
			conferenceId: t.arg.id({ required: true }),
			entryCode: t.arg.string({ required: true })
		},
		resolve: async (query, _root, args, ctx) => {
			const id = userId(ctx);
			if (!id) {
				throw apiError('UNAUTHENTICATED', m.mustBeLoggedIn());
			}

			const createdId = await joinDelegationByEntryCode(id, args.conferenceId, args.entryCode);

			delegationMemberPubsub.created();

			return db.query.delegationMember
				.findFirst(
					query(
						(await ctx.abilities.delegationMember.filter('read')).merge({
							where: { id: createdId }
						}).query.single
					)
				)
				.then(assertFindFirstExists);
		}
	}),

	/**
	 * Removing a delegate. If the head delegate leaves, another member is promoted; if nobody is
	 * left, the delegation itself goes. Same ordering as the legacy resolver.
	 */
	deleteDelegationMember: t.field({
		type: 'Boolean',
		args: { id: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			const delegationId = await removeDelegationMember(ctx, args.id);

			delegationMemberPubsub.removed();
			// The delegation either lost its last member and went with it, or had a new head
			// delegate promoted into place.
			if (delegationId) {
				delegationPubsub.updated(delegationId);
			} else {
				delegationPubsub.removed();
			}

			return true;
		}
	})
}));

schemaBuilder.mutationFields((t) => ({
	/**
	 * Management placing a user straight into an assigned delegation, bypassing the normal
	 * application flow. The delegation is created on demand for the nation or non-state actor if
	 * none exists yet.
	 */
	createAppliedDelegationMember: t.drizzleField({
		type: DelegationMemberRef,
		args: {
			userId: t.arg.id({ required: true }),
			conferenceId: t.arg.id({ required: true }),
			assignedNationAlpha3Code: t.arg.string(),
			assignedNonStateActorId: t.arg.id(),
			assignedCommitteeId: t.arg.id()
		},
		resolve: async (query, _root, args, ctx) => {
			await assertTeamRole(ctx, args.conferenceId, PARTICIPANT_CARE_ROLES);

			if (countGiven(args.assignedNationAlpha3Code, args.assignedNonStateActorId) === 0) {
				throw apiError('INVALID_INPUT', m.delegationMemberNeedsRole());
			}
			await assertOfferedIn(args.conferenceId, args);

			const memberId = await placeUserInAssignedDelegation(args);

			delegationMemberPubsub.created();
			delegationPubsub.created();
			waitingListEntryPubsub.updated();
			// An existing single registration for the same person is cleared out of the way.
			singleParticipantPubsub.removed();

			return db.query.delegationMember
				.findFirst(
					query(
						(await ctx.abilities.delegationMember.filter('read')).merge({ where: { id: memberId } })
							.query.single
					)
				)
				.then(assertFindFirstExists);
		}
	})
}));

schemaBuilder.mutationFields((t) => ({
	/**
	 * Moves a delegate into a committee. Committees have a per-delegation seat limit, so when the
	 * target is already full for this delegation the longest-untouched occupant is displaced into
	 * the seat this member is leaving - a swap, rather than a refusal.
	 */
	updateDelegationMemberCommittee: t.drizzleField({
		type: DelegationMemberRef,
		args: {
			id: t.arg.id({ required: true }),
			assignedCommitteeId: t.arg.id({ required: true })
		},
		resolve: async (query, _root, args, ctx) => {
			await moveMemberToCommittee(ctx, args.id, args.assignedCommitteeId);

			delegationMemberPubsub.updated(args.id);

			return db.query.delegationMember
				.findFirst(
					query(
						(await ctx.abilities.delegationMember.filter('read')).merge({ where: { id: args.id } })
							.query.single
					)
				)
				.then(assertFindFirstExists);
		}
	}),

	/** Bulk committee (un)assignment; a null committee clears the assignment. */
	updateManyDelegationMemberCommittee: t.field({
		type: 'Int',
		args: {
			conferenceId: t.arg.id({ required: true }),
			ids: t.arg.idList({ required: true }),
			assignedCommitteeId: t.arg.id()
		},
		resolve: async (_root, args, ctx) => {
			if (args.ids.length === 0) return 0;
			const count = await moveManyMembersToCommittee(
				ctx,
				args.conferenceId,
				args.ids,
				args.assignedCommitteeId
			);

			delegationMemberPubsub.updated(args.ids);

			return count;
		}
	})
}));

const CommitteeAssignmentInput = schemaBuilder.inputType('CommitteeAssignmentInput', {
	fields: (t) => ({
		delegationMemberId: t.id({ required: true }),
		committeeId: t.id({ required: true })
	})
});

schemaBuilder.mutationFields((t) => ({
	/**
	 * Applies the committee assignment produced by the assignment assistant.
	 *
	 * Each pairing is validated before it is written: the committee must belong to the same
	 * conference as the delegate, and it must actually seat the delegation's assigned nation.
	 * One bad pairing rolls the whole batch back, which is why this runs in a transaction rather
	 * than writing as it goes.
	 */
	assignCommitteesToDelegationMembers: t.drizzleField({
		type: [DelegationMemberRef],
		args: {
			conferenceId: t.arg.id({ required: true }),
			assignments: t.arg({ type: [CommitteeAssignmentInput], required: true })
		},
		resolve: async (query, _root, args, ctx) => {
			await assignCommittees(ctx, args.assignments);

			delegationMemberPubsub.updated();

			return db.query.delegationMember.findMany(
				query(
					(await ctx.abilities.delegationMember.filter('read')).merge({
						where: { conferenceId: args.conferenceId }
					}).query.many
				)
			);
		}
	})
}));
