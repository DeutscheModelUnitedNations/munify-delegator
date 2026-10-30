import { db } from '#api/db/db';
import { scheduleEmailSweep } from '#api/handlers/email/emailSweep';
import { object, query, schemaBuilder } from '#api/rumble';
import {
	assignCommittees,
	joinDelegationByEntryCode,
	moveMemberToCommittee,
	placeUserInAssignedDelegation,
	removeDelegationMember,
	switchSeats
} from './delegationMemberService';
import {
	assertCanAssignCommittees,
	assertCanCreateAppliedDelegationMember,
	assertCanDeleteDelegationMember,
	assertCanMoveDelegationMemberToCommittee,
	assertCanSwitchDelegationMemberSeats,
	assertOfferedIn,
	registerDelegationMemberAbilities
} from './delegationMemberPermissions';
import { codeGuessLimiter } from '#api/services/codeGuessLimit';
import { assertFindFirstExists } from '@m1212e/rumble';
import {
	conferenceParticipantPubsub,
	delegationMemberPubsub,
	delegationPubsub,
	schoolPubsub,
	singleParticipantPubsub,
	waitingListEntryPubsub
} from '#api/pubsub';
import { queryAllowed } from '#api/services/authHelper/utils';

registerDelegationMemberAbilities();

const DelegationMemberRef = object({ table: 'delegationMember' });
query({ table: 'delegationMember' });
schemaBuilder.mutationFields((t) => ({
	/** Joining a delegation by entry code, with the newcomer's own school. */
	createDelegationMember: t.drizzleField({
		type: DelegationMemberRef,
		args: {
			conferenceId: t.arg.id({ required: true }),
			entryCode: t.arg.string({ required: true }),
			/** An existing school, or `schoolName` to find or create one; neither keeps theirs. */
			schoolId: t.arg.id(),
			schoolName: t.arg.string()
		},
		resolve: async (query, _root, args, ctx) => {
			const caller = ctx.mustBeLoggedIn().sub;
			const createdId = await codeGuessLimiter.attempt(caller, () =>
				joinDelegationByEntryCode(caller, args.conferenceId, args.entryCode, {
					schoolId: args.schoolId,
					schoolName: args.schoolName
				})
			);

			delegationMemberPubsub.created();
			conferenceParticipantPubsub.updated();
			if (args.schoolName) schoolPubsub.created();

			return db.query.delegationMember
				.findFirst(query(await queryAllowed(ctx.abilities.delegationMember, createdId)))
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
			conferenceParticipantPubsub.updated();
			waitingListEntryPubsub.updated();
			// An existing single registration for the same person is cleared out of the way.
			singleParticipantPubsub.removed();
			scheduleEmailSweep(args.conferenceId, ctx.requestUrl().origin);

			return db.query.delegationMember
				.findFirst(query(await queryAllowed(ctx.abilities.delegationMember, memberId)))
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
				.findFirst(query(await queryAllowed(ctx.abilities.delegationMember, args.id)))
				.then(assertFindFirstExists);
		}
	})
}));

const CommitteeAssignmentInput = schemaBuilder.inputType('CommitteeAssignmentInput', {
	fields: (t) => ({
		delegationMemberId: t.id({ required: true }),
		/** Null clears the delegate's committee. */
		committeeId: t.id()
	})
});

schemaBuilder.mutationFields((t) => ({
	/**
	 * Applies a committee assignment: the assistant's result, or the delegation modal clearing its
	 * members' committees (a null committee).
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
			await assertCanAssignCommittees(ctx, args.conferenceId, args.assignments);
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

schemaBuilder.mutationFields((t) => ({
	/**
	 * Swaps the seats (delegation and committee) of two delegates, or moves one into a free seat of
	 * a role (`targetRoleId`, with `targetCommitteeId` for a nation). Head delegates stay with the
	 * seat unless `headDelegateMemberIds` chooses them; every delegation keeps exactly one.
	 */
	switchDelegationMemberSeats: t.drizzleField({
		type: [DelegationMemberRef],
		args: {
			conferenceId: t.arg.id({ required: true }),
			memberId: t.arg.id({ required: true }),
			otherMemberId: t.arg.id(),
			targetRoleId: t.arg.id(),
			targetCommitteeId: t.arg.id(),
			headDelegateMemberIds: t.arg.idList()
		},
		resolve: async (query, _root, args, ctx) => {
			await assertCanSwitchDelegationMemberSeats(ctx, args);
			const { memberIds, delegationIds, createdDelegation } = await switchSeats(args);

			for (const id of memberIds) delegationMemberPubsub.updated(id);
			// Head delegates may have changed in any delegation involved.
			delegationMemberPubsub.updated();
			for (const id of delegationIds) delegationPubsub.updated(id);
			if (createdDelegation) delegationPubsub.created();
			scheduleEmailSweep(args.conferenceId, ctx.requestUrl().origin);

			return db.query.delegationMember.findMany(
				query(
					(await ctx.abilities.delegationMember.filter('read')).merge({
						where: { id: { in: memberIds } }
					}).query.many
				)
			);
		}
	})
}));
