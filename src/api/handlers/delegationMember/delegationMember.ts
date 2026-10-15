import { db } from '$api/db/db';
import { object, query, schemaBuilder } from '$api/rumble';
import {
	assignCommittees,
	joinDelegationByEntryCode,
	moveManyMembersToCommittee,
	moveMemberToCommittee,
	placeUserInAssignedDelegation,
	removeDelegationMember
} from './delegationMemberService';
import {
	assertCanAssignCommittees,
	assertCanCreateAppliedDelegationMember,
	assertCanDeleteDelegationMember,
	assertCanMoveDelegationMemberToCommittee,
	assertOfferedIn,
	authorizeDelegationMemberCommitteeMoves,
	registerDelegationMemberAbilities
} from './delegationMemberPermissions';
import { assertFindFirstExists } from '@m1212e/rumble';
import {
	delegationMemberPubsub,
	delegationPubsub,
	singleParticipantPubsub,
	waitingListEntryPubsub
} from '$api/pubsub';

registerDelegationMemberAbilities();

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
			const createdId = await joinDelegationByEntryCode(
				ctx.mustBeLoggedIn().sub,
				args.conferenceId,
				args.entryCode
			);

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
			await assertCanDeleteDelegationMember(ctx, args.id);
			const delegationId = await removeDelegationMember(args.id);

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
	 * application flow. The delegation is created on demand for the role if none holds it yet.
	 */
	createAppliedDelegationMember: t.drizzleField({
		type: DelegationMemberRef,
		args: {
			userId: t.arg.id({ required: true }),
			conferenceId: t.arg.id({ required: true }),
			/** A nation or non-state actor of the conference. */
			assignedRoleId: t.arg.id({ required: true }),
			assignedCommitteeId: t.arg.id()
		},
		resolve: async (query, _root, args, ctx) => {
			await assertCanCreateAppliedDelegationMember(ctx, args.conferenceId);

			await assertOfferedIn(args.conferenceId, {
				roleId: args.assignedRoleId,
				committeeId: args.assignedCommitteeId
			});

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
			await moveMemberToCommittee(
				await assertCanMoveDelegationMemberToCommittee(ctx, args.id, args.assignedCommitteeId)
			);

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
			const updatableWhere = await authorizeDelegationMemberCommitteeMoves(
				ctx,
				args.conferenceId,
				args.assignedCommitteeId
			);
			const count = await moveManyMembersToCommittee(
				args.ids,
				args.assignedCommitteeId,
				updatableWhere
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
			await assertCanAssignCommittees(ctx, args.assignments);
			await assignCommittees(args.assignments);

			delegationMemberPubsub.updated();

			return db.query.delegationMember.findMany(
				query(
					(await ctx.abilities.delegationMember.filter('read')).merge({
						where: { participant: { conferenceId: args.conferenceId } }
					}).query.many
				)
			);
		}
	})
}));
