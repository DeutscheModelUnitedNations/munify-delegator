import { schoolNameSchema } from '#lib/schemata/schoolChoice';
import { db } from '#api/db/db';
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

registerDelegationMemberAbilities();

const DelegationMemberRef = object({ table: 'delegationMember' });
query({ table: 'delegationMember' });
schemaBuilder.mutationFields((t) => ({
	createDelegationMember: t.drizzleField({
		description: "Joining a delegation by entry code, with the newcomer's own school.",
		type: DelegationMemberRef,
		args: {
			conferenceId: t.arg.id({ required: true }),
			entryCode: t.arg.string({ required: true }),
			/** An existing school, or `schoolName` to find or create one; neither keeps theirs. */
			schoolId: t.arg.id(),
			schoolName: t.arg.string().validate(schoolNameSchema)
		},
		resolve: async (query, _root, args, ctx) => {
			const caller = ctx.mustBeLoggedIn().sub;
			const createdId = await codeGuessLimiter.attempt({
				key: caller,
				run: () =>
					joinDelegationByEntryCode({
						userId: caller,
						conferenceId: args.conferenceId,
						entryCode: args.entryCode,
						school: {
							schoolId: args.schoolId,
							schoolName: args.schoolName
						}
					})
			});

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

	deleteDelegationMember: t.field({
		description:
			'Removing a delegate. If the head delegate leaves, another member is promoted; if nobody is left, the delegation itself goes.',
		type: 'Boolean',
		args: { id: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			await assertCanDeleteDelegationMember({ ctx, id: args.id });
			await removeDelegationMember(args.id);

			return true;
		}
	})
}));

schemaBuilder.mutationFields((t) => ({
	createAppliedDelegationMember: t.drizzleField({
		description:
			'Management placing a user straight into an assigned delegation, bypassing the normal application flow. The delegation is created on demand for the role if none holds it yet.',
		type: DelegationMemberRef,
		args: {
			userId: t.arg.id({ required: true }),
			conferenceId: t.arg.id({ required: true }),
			/** A nation or non-state actor of the conference. */
			assignedRoleId: t.arg.id({ required: true }),
			assignedCommitteeId: t.arg.id()
		},
		resolve: async (query, _root, args, ctx) => {
			await assertCanCreateAppliedDelegationMember({ ctx, conferenceId: args.conferenceId });

			await assertOfferedIn({
				conferenceId: args.conferenceId,
				ref: {
					roleId: args.assignedRoleId,
					committeeId: args.assignedCommitteeId
				}
			});

			const memberId = await placeUserInAssignedDelegation(args);

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
	updateDelegationMemberCommittee: t.drizzleField({
		description:
			'Moves a delegate into a committee. Committees have a per-delegation seat limit, so when the target is already full for this delegation the longest-untouched occupant is displaced into the seat this member is leaving - a swap, rather than a refusal.',
		type: DelegationMemberRef,
		args: {
			id: t.arg.id({ required: true }),
			assignedCommitteeId: t.arg.id({ required: true })
		},
		resolve: async (query, _root, args, ctx) => {
			await moveMemberToCommittee(
				await assertCanMoveDelegationMemberToCommittee({
					ctx,
					id: args.id,
					assignedCommitteeId: args.assignedCommitteeId
				})
			);

			return db.query.delegationMember
				.findFirst(
					query(
						(await ctx.abilities.delegationMember.filter('read')).merge({ where: { id: args.id } })
							.query.single
					)
				)
				.then(assertFindFirstExists);
		}
	})
}));

const CommitteeAssignmentInput = schemaBuilder.inputType('CommitteeAssignmentInput', {
	fields: (t) => ({
		delegationMemberId: t.id({ required: true }),
		committeeId: t.id({ description: "Null clears the delegate's committee." })
	})
});

schemaBuilder.mutationFields((t) => ({
	assignCommitteesToDelegationMembers: t.drizzleField({
		description:
			"Applies a committee assignment: the assistant's result, or the delegation modal clearing its members' committees (a null committee). Each pairing is validated before it is written: the committee must belong to the same conference as the delegate, and it must actually seat the delegation's assigned nation. One bad pairing rolls the whole batch back, which is why this runs in a transaction rather than writing as it goes.",
		type: [DelegationMemberRef],
		args: {
			conferenceId: t.arg.id({ required: true }),
			assignments: t.arg({ type: [CommitteeAssignmentInput], required: true })
		},
		resolve: async (query, _root, args, ctx) => {
			await assertCanAssignCommittees({
				ctx,
				conferenceId: args.conferenceId,
				assignments: args.assignments
			});
			await assignCommittees(args.assignments);

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
	switchDelegationMemberSeats: t.drizzleField({
		description:
			'Swaps the seats (delegation and committee) of two delegates, or moves one into a free seat of a role (`targetRoleId`, with `targetCommitteeId` for a nation). Head delegates stay with the seat unless `headDelegateMemberIds` chooses them; every delegation keeps exactly one.',
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
			await assertCanSwitchDelegationMemberSeats({ ctx, args });
			const memberIds = await switchSeats(args);

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
