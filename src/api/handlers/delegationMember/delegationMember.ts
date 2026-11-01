import { schoolNameSchema } from '#lib/schemata/schoolChoice';
import { db } from '#api/db/db';
import { object, query, schemaBuilder, type ApiContext } from '#api/rumble';
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
	registerDelegationMemberAbilities
} from './delegationMemberPermissions';
import { codeGuessLimiter } from '#api/services/codeGuessLimit';
import { assertFindFirstExists } from '@m1212e/rumble';

registerDelegationMemberAbilities();

const DelegationMemberRef = object({ table: 'delegationMember' });
query({ table: 'delegationMember' });

/** The delegation members `ids` as far as the caller may read them. */
async function readableMembers({ ctx, ids }: { ctx: ApiContext; ids: string[] }) {
	return (await ctx.abilities.delegationMember.filter('read')).merge({
		where: { id: { in: ids } }
	}).query.many;
}

/** The delegation member `id` as far as the caller may read it, for a `drizzleField` to answer with. */
async function readableMember({ ctx, id }: { ctx: ApiContext; id: string }) {
	return (await ctx.abilities.delegationMember.filter('read')).merge({ where: { id } }).query
		.single;
}

const CommitteeAssignmentInput = schemaBuilder.inputType('CommitteeAssignmentInput', {
	fields: (t) => ({
		delegationMemberId: t.id({ required: true }),
		committeeId: t.id({ description: "Null clears the delegate's committee." })
	})
});

schemaBuilder.mutationFields((t) => ({
	createDelegationMember: t.drizzleField({
		description:
			"Joins the caller to a delegation by its entry code, with the newcomer's own school. A wrong code answers NOT_FOUND (ten in ten minutes: TOO_MANY_ATTEMPTS); outside the registration window, an applied delegation or a caller already in the conference answer CONFLICT.",
		type: DelegationMemberRef,
		args: {
			conferenceId: t.arg.id({ required: true }),
			entryCode: t.arg.string({ required: true }),
			schoolId: t.arg.id({
				description:
					"An existing school as the newcomer's own; neither school argument keeps the one they have."
			}),
			schoolName: t.arg
				.string({
					description: 'The name of a school to find (ignoring case and spacing) or create.'
				})
				.validate(schoolNameSchema)
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
						school: { schoolId: args.schoolId, schoolName: args.schoolName }
					})
			});

			return db.query.delegationMember
				.findFirst(query(await readableMember({ ctx, id: createdId })))
				.then(assertFindFirstExists);
		}
	}),

	deleteDelegationMember: t.field({
		description:
			'Removes a delegate: the member themselves or their head delegate until the delegation has applied, participant care at any time. If the head delegate leaves, another member is promoted; if nobody is left, the delegation itself goes.',
		type: 'Boolean',
		args: { id: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			await assertCanDeleteDelegationMember({ ctx, id: args.id });
			await removeDelegationMember(args.id);
			return true;
		}
	}),

	createAppliedDelegationMember: t.drizzleField({
		description:
			"Participant care placing a user straight into the delegation holding a role, bypassing the application. The user's delegation membership or single registration in the conference is cleared first; a supervisor or team member is refused with CONFLICT, as is a role with no seat left or a committee that already seats as many of the delegation as it may. The delegation is created for the role if none holds it yet.",
		type: DelegationMemberRef,
		args: {
			userId: t.arg.id({ required: true }),
			conferenceId: t.arg.id({ required: true }),
			assignedRoleId: t.arg.id({
				required: true,
				description: 'A nation or non-state actor of the conference.'
			}),
			assignedCommitteeId: t.arg.id({
				description: 'A committee of the conference that seats the role; left out seats nowhere.'
			})
		},
		resolve: async (query, _root, args, ctx) => {
			await assertCanCreateAppliedDelegationMember({ ctx, args });
			const memberId = await placeUserInAssignedDelegation(args);

			return db.query.delegationMember
				.findFirst(query(await readableMember({ ctx, id: memberId })))
				.then(assertFindFirstExists);
		}
	}),

	updateDelegationMemberCommittee: t.drizzleField({
		description:
			"Moves a delegate into a committee that seats their delegation's role. When the committee is already full for the delegation, participant care displaces the longest-untouched occupant into the seat this member leaves; a head delegate is refused with CONFLICT.",
		type: DelegationMemberRef,
		args: {
			id: t.arg.id({ required: true }),
			assignedCommitteeId: t.arg.id({ required: true })
		},
		resolve: async (query, _root, args, ctx) => {
			const move = await assertCanMoveDelegationMemberToCommittee({
				ctx,
				id: args.id,
				assignedCommitteeId: args.assignedCommitteeId
			});
			await moveMemberToCommittee(move);

			return db.query.delegationMember
				.findFirst(query(await readableMember({ ctx, id: args.id })))
				.then(assertFindFirstExists);
		}
	}),

	assignCommitteesToDelegationMembers: t.drizzleField({
		description:
			"Applies a committee assignment in one go: the head delegate's committee assignment page, or the delegation modal clearing its members' committees (a null committee). Every committee has to be the conference's and seat the member's delegation; one pairing refused, or a committee left with more of a delegation than it seats (CONFLICT), rolls the whole batch back. Answers with the members it seated.",
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
			const memberIds = await assignCommittees(args.assignments);

			return db.query.delegationMember.findMany(
				query(await readableMembers({ ctx, ids: memberIds }))
			);
		}
	}),

	switchDelegationMemberSeats: t.drizzleField({
		description:
			'Swaps the seats (delegation and committee) of two delegates, or moves one into a free seat of a role. Head delegates stay with the seat unless `headDelegateMemberIds` chooses them; every delegation keeps exactly one. A taken seat or a concurrent switch answers CONFLICT. Answers with the members moved.',
		type: [DelegationMemberRef],
		args: {
			conferenceId: t.arg.id({ required: true }),
			memberId: t.arg.id({ required: true }),
			otherMemberId: t.arg.id({
				description: 'Swap with this member; leave out to move into a free seat instead.'
			}),
			targetRoleId: t.arg.id({
				description: 'Move into a free seat of this role, instead of swapping.'
			}),
			targetCommitteeId: t.arg.id({
				description: "The committee of the free seat, for a nation's role."
			}),
			headDelegateMemberIds: t.arg.idList({
				description:
					'The head delegates of the delegations involved after the switch; left out keeps the defaults.'
			})
		},
		resolve: async (query, _root, args, ctx) => {
			await assertCanSwitchDelegationMemberSeats({ ctx, args });
			const memberIds = await switchSeats(args);

			return db.query.delegationMember.findMany(
				query(await readableMembers({ ctx, ids: memberIds }))
			);
		}
	})
}));
