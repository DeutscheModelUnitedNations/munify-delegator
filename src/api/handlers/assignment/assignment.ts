import { db } from '#api/db/db';
import { scheduleEmailSweep } from '#api/handlers/email/emailSweep';
import { enum_, object, countQuery, query, schemaBuilder, type ApiContext } from '#api/rumble';
import { applyAssignmentDraft } from './applyDraft';
import { reviewArgsSchema } from './review';
import { assertFindFirstExists } from '@m1212e/rumble';
import { assertCustomRolesOf, assertOfferedIn } from '#api/services/authHelper/rules';
import {
	assertCanAssignDelegation,
	assertCanAssignSingleParticipant,
	assertCanAssignUnit,
	assertCanPlanAssignment,
	assertCanReleaseAssignment,
	assertCanReviewApplication,
	assertPartsAreOwnMembers,
	registerAssignmentAbilities
} from './assignmentPermissions';
import {
	autoAssignDelegations,
	autoAssignSingleParticipants,
	convertSingleParticipant,
	discardAssignmentDraft,
	parseSplitParts,
	planDelegationRole,
	planSingleParticipantRole,
	planUnitRole,
	resetAssignmentSize,
	revertSingleParticipantConversion,
	setAssignmentReleased,
	splitDelegation,
	undoDelegationSplit,
	upsertAssignmentReview,
	upsertAssignmentWeights
} from './assignmentService';

registerAssignmentAbilities();

const AssignmentReviewRef = object({ table: 'assignmentReview' });
query({ table: 'assignmentReview' });
countQuery({ table: 'assignmentReview' });
object({ table: 'assignmentUnit' });
query({ table: 'assignmentUnit' });
object({ table: 'assignmentUnitMember' });
object({ table: 'assignmentSingleRole' });
query({ table: 'assignmentSingleRole' });
const AssignmentWeightsRef = object({ table: 'assignmentWeights' });
query({ table: 'assignmentWeights' });

const markEffectEnum = enum_({ tsName: 'assignmentMarkEffect' });
const experienceEffectEnum = enum_({ tsName: 'assignmentExperienceEffect' });

const SplitPartInput = schemaBuilder.inputType('AssignmentSplitPartInput', {
	fields: (t) => ({ memberIds: t.idList({ required: true }) })
});

/** Checks the caller may plan this single participant's assignment, then plans `change`. */
async function onSingleParticipant({
	ctx,
	id,
	change
}: {
	ctx: ApiContext;
	id: string;
	change: (
		participant: Awaited<ReturnType<typeof assertCanAssignSingleParticipant>>
	) => Promise<unknown>;
}) {
	await change(await assertCanAssignSingleParticipant({ ctx, id }));
	return true;
}

schemaBuilder.mutationFields((t) => ({
	upsertAssignmentReview: t.drizzleField({
		description:
			"Changes the team's review of one application, creating it on the first change. Fields left out stay as they are; `null` clears the rating or the note.",
		type: AssignmentReviewRef,
		args: t.validate(
			{
				delegationId: t.arg.id({ required: false }),
				singleParticipantId: t.arg.id({ required: false }),
				evaluation: t.arg.float({ required: false }),
				flagged: t.arg.boolean({ required: false }),
				disqualified: t.arg.boolean({ required: false }),
				required: t.arg.boolean({ required: false }),
				note: t.arg.string({ required: false })
			},
			reviewArgsSchema
		),
		resolve: async (query, _root, review, ctx) => {
			const { conferenceId } = await assertCanReviewApplication({
				ctx,
				application: review.application
			});

			const reviewId = await upsertAssignmentReview({ conferenceId, review });

			return db.query.assignmentReview
				.findFirst(
					query(
						(await ctx.abilities.assignmentReview.filter('read')).merge({ where: { id: reviewId } })
							.query.single
					)
				)
				.then(assertFindFirstExists);
		}
	}),

	upsertAssignmentWeights: t.drizzleField({
		description:
			'Changes the given weights of the automatic assignment; the others stay as they are.',
		type: AssignmentWeightsRef,
		args: {
			conferenceId: t.arg.id({ required: true }),
			nullRating: t.arg.float(),
			ratingFactor: t.arg.float(),
			markBonus: t.arg.float(),
			markEffect: t.arg({ type: markEffectEnum }),
			experienceModifier: t.arg.float(),
			experienceEffect: t.arg({ type: experienceEffectEnum })
		},
		resolve: async (query, _root, { conferenceId, ...args }, ctx) => {
			await assertCanPlanAssignment({ ctx, conferenceId });
			// The weights are never null in the table: null leaves one as it is, like undefined.
			const weights = {
				nullRating: args.nullRating ?? undefined,
				ratingFactor: args.ratingFactor ?? undefined,
				markBonus: args.markBonus ?? undefined,
				markEffect: args.markEffect ?? undefined,
				experienceModifier: args.experienceModifier ?? undefined,
				experienceEffect: args.experienceEffect ?? undefined
			};
			const weightsId = await upsertAssignmentWeights({ conferenceId, weights });

			return db.query.assignmentWeights
				.findFirst(
					query(
						(await ctx.abilities.assignmentWeights.filter('read')).merge({
							where: { id: weightsId }
						}).query.single
					)
				)
				.then(assertFindFirstExists);
		}
	}),

	assignDelegation: t.field({
		description:
			'Plans a nation or non-state actor for a whole delegation; no `roleId` plans none.',
		type: 'Boolean',
		args: {
			delegationId: t.arg.id({ required: true }),
			roleId: t.arg.id({ required: false })
		},
		resolve: async (_root, args, ctx) => {
			const delegation = await assertCanAssignDelegation({ ctx, id: args.delegationId });
			const roleId = args.roleId || null;
			if (roleId) await assertOfferedIn({ conferenceId: delegation.conferenceId, ref: { roleId } });
			await planDelegationRole({ delegation, roleId });
			return true;
		}
	}),

	assignAssignmentUnit: t.field({
		description:
			'Plans a role for one part of a split delegation or a converted single participant.',
		type: 'Boolean',
		args: {
			unitId: t.arg.id({ required: true }),
			roleId: t.arg.id({ required: false })
		},
		resolve: async (_root, args, ctx) => {
			const unit = await assertCanAssignUnit({ ctx, unitId: args.unitId });
			const roleId = args.roleId || null;
			if (roleId) await assertOfferedIn({ conferenceId: unit.conferenceId, ref: { roleId } });
			await planUnitRole({ unitId: unit.id, roleId });
			return true;
		}
	}),

	splitDelegation: t.field({
		description:
			'Splits a delegation into parts that are assigned separately. Replaces an earlier split.',
		type: 'Boolean',
		args: {
			delegationId: t.arg.id({ required: true }),
			parts: t.arg({ type: [SplitPartInput], required: true })
		},
		resolve: async (_root, args, ctx) => {
			const delegation = await assertCanAssignDelegation({ ctx, id: args.delegationId });
			const parts = parseSplitParts({ parts: args.parts, memberCount: delegation.members.length });
			assertPartsAreOwnMembers({ delegation, parts });
			await splitDelegation({ delegation, parts });
			return true;
		}
	}),

	undoDelegationSplit: t.field({
		type: 'Boolean',
		args: { delegationId: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			const delegation = await assertCanAssignDelegation({ ctx, id: args.delegationId });
			await undoDelegationSplit(delegation.id);
			return true;
		}
	}),

	convertSingleParticipant: t.field({
		description: 'Plans to turn a single participant into a delegation of their own.',
		type: 'Boolean',
		args: { singleParticipantId: t.arg.id({ required: true }) },
		resolve: (_root, args, ctx) =>
			onSingleParticipant({ ctx, id: args.singleParticipantId, change: convertSingleParticipant })
	}),

	revertSingleParticipantConversion: t.field({
		type: 'Boolean',
		args: { singleParticipantId: t.arg.id({ required: true }) },
		resolve: (_root, args, ctx) =>
			onSingleParticipant({
				ctx,
				id: args.singleParticipantId,
				change: (participant) => revertSingleParticipantConversion(participant.id)
			})
	}),

	assignSingleParticipantRole: t.field({
		description: 'Plans a custom role for a single participant; no `roleId` plans none.',
		type: 'Boolean',
		args: {
			singleParticipantId: t.arg.id({ required: true }),
			roleId: t.arg.id({ required: false })
		},
		resolve: async (_root, args, ctx) => {
			const participant = await assertCanAssignSingleParticipant({
				ctx,
				id: args.singleParticipantId
			});
			const roleId = args.roleId || null;
			await assertCustomRolesOf({
				conferenceId: participant.conferenceId,
				roleIds: roleId ? [roleId] : []
			});
			await planSingleParticipantRole({ participant, roleId });
			return true;
		}
	}),

	autoAssignDelegations: t.field({
		description: 'Returns how many delegations got a role.',
		type: 'Int',
		args: { conferenceId: t.arg.id({ required: true }), size: t.arg.int({ required: true }) },
		resolve: async (_root, args, ctx) => {
			await assertCanPlanAssignment({ ctx, conferenceId: args.conferenceId });
			const assignedCount = await autoAssignDelegations({
				conferenceId: args.conferenceId,
				size: args.size
			});
			return assignedCount;
		}
	}),

	autoAssignSingleParticipants: t.field({
		description: 'Returns how many single participants got a role.',
		type: 'Int',
		args: { conferenceId: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			await assertCanPlanAssignment({ ctx, conferenceId: args.conferenceId });
			const assignedCount = await autoAssignSingleParticipants(args.conferenceId);
			return assignedCount;
		}
	}),

	resetAssignmentSize: t.field({
		description: 'Unplans every role with `seats` seats.',
		type: 'Boolean',
		args: { conferenceId: t.arg.id({ required: true }), seats: t.arg.int({ required: true }) },
		resolve: async (_root, args, ctx) => {
			await assertCanPlanAssignment({ ctx, conferenceId: args.conferenceId });
			await resetAssignmentSize(args);
			return true;
		}
	}),

	discardAssignmentDraft: t.field({
		description: 'Deletes the draft. Ratings and weights stay.',
		type: 'Boolean',
		args: { conferenceId: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			await assertCanPlanAssignment({ ctx, conferenceId: args.conferenceId });
			await discardAssignmentDraft(args.conferenceId);
			return true;
		}
	}),

	applyAssignment: t.field({
		description:
			'Writes the draft into the registrations, or refuses while it has problems. Participants see the result only once it is released.',
		type: 'Boolean',
		args: { conferenceId: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			await assertCanPlanAssignment({ ctx, conferenceId: args.conferenceId });
			await applyAssignmentDraft(args.conferenceId);
			scheduleEmailSweep({ conferenceId: args.conferenceId, origin: ctx.requestUrl().origin });
			return true;
		}
	}),

	setAssignmentReleased: t.field({
		description:
			'Shows participants their roles, or hides them. See `setAssignmentReleased` for `sendEmails`.',
		type: 'Boolean',
		args: {
			conferenceId: t.arg.id({ required: true }),
			released: t.arg.boolean({ required: true }),
			sendEmails: t.arg.boolean()
		},
		resolve: async (_root, args, ctx) => {
			await assertCanReleaseAssignment({
				ctx,
				conferenceId: args.conferenceId,
				decidesEmails: args.sendEmails != null
			});
			await setAssignmentReleased({
				conferenceId: args.conferenceId,
				released: args.released,
				sendEmails: args.sendEmails ?? undefined
			});
			scheduleEmailSweep({ conferenceId: args.conferenceId, origin: ctx.requestUrl().origin });
			return true;
		}
	})
}));
