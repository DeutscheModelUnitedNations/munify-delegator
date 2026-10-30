import { db } from '#api/db/db';
import { scheduleEmailSweep } from '#api/handlers/email/emailSweep';
import { enum_, object, countQuery, query, schemaBuilder, type ApiContext } from '#api/rumble';
import { applyAssignmentDraft, draftDelegationTarget } from './assignmentDraft';
import { reviewProblem, reviewRow } from './review';
import type { Target } from '#lib/assignment/state';
import { assertFindFirstExists } from '@m1212e/rumble';
import {
	assignmentReviewPubsub,
	assignmentSingleRolePubsub,
	assignmentUnitMemberPubsub,
	assignmentUnitPubsub,
	assignmentWeightsPubsub,
	conferenceEmailSettingPubsub,
	conferencePubsub,
	delegationMemberPubsub,
	delegationPubsub,
	singleParticipantPubsub
} from '#api/pubsub';
import { m } from '#lib/paraglide/messages';
import { apiError } from '#api/services/errors/apiError';
import {
	assertCanAssignDelegation,
	assertCanAssignSingleParticipant,
	assertCanAssignUnit,
	assertCanPlanAssignment,
	assertCanReleaseAssignment,
	assertCanReviewApplication,
	assertCustomRoleOf,
	assertSplitMembersOf,
	assertTargetOf,
	registerAssignmentAbilities
} from './assignmentPermissions';
import {
	autoAssignDelegations,
	autoAssignSingleParticipants,
	convertSingleParticipant,
	discardAssignmentDraft,
	draftUnitTarget,
	planSingleParticipantRole,
	resetAssignmentSize,
	revertSingleParticipantConversion,
	setAssignmentReleased,
	setAssignmentReview,
	setAssignmentWeights,
	splitDelegation,
	splitParts,
	undoDelegationSplit
} from './assignmentService';
import { readableById } from '#api/services/authHelper';

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

/**
 * Every draft table changed. A draft write creates, changes and deletes rows in one go, and the
 * board's lists only hear about rows coming and going, so all three are announced.
 */
function publishDraft() {
	for (const pubsub of [
		assignmentUnitPubsub,
		assignmentUnitMemberPubsub,
		assignmentSingleRolePubsub
	]) {
		pubsub.created();
		pubsub.removed();
		pubsub.updated();
	}
}

/** A resolver for a draft change to one single participant the caller may assign. */
const singleParticipantDraftChange =
	(
		change: (
			participant: Awaited<ReturnType<typeof assertCanAssignSingleParticipant>>
		) => Promise<unknown>
	) =>
	async (_root: unknown, args: { singleParticipantId: string }, ctx: ApiContext) => {
		await change(await assertCanAssignSingleParticipant(ctx, args.singleParticipantId));
		publishDraft();
		return true;
	};

const SplitPartInput = schemaBuilder.inputType('AssignmentSplitPartInput', {
	fields: (t) => ({ memberIds: t.idList({ required: true }) })
});

const targetFrom = (args: { roleId?: string | null }): Target => ({ roleId: args.roleId || null });

const REVIEW_PROBLEMS = {
	application: () => m.assignmentReviewNameOneApplication(),
	evaluation: () => m.assignmentReviewRatingRange(),
	requiredAndExcluded: () => m.assignmentReviewRequiredAndExcluded()
};

schemaBuilder.mutationFields((t) => ({
	/** Records the team's rating of one application, replacing the previous one. */
	setAssignmentReview: t.drizzleField({
		type: AssignmentReviewRef,
		args: {
			delegationId: t.arg.id({ required: false }),
			singleParticipantId: t.arg.id({ required: false }),
			evaluation: t.arg.float({ required: false }),
			flagged: t.arg.boolean({ required: true }),
			disqualified: t.arg.boolean({ required: true }),
			/** Left out keeps nothing: the review is replaced whole, so it counts as not required. */
			required: t.arg.boolean({ required: false }),
			note: t.arg.string({ required: false })
		},
		resolve: async (query, _root, args, ctx) => {
			const problem = reviewProblem(args);
			if (problem) throw apiError('INVALID_INPUT', REVIEW_PROBLEMS[problem]());
			const review = reviewRow(args);
			const conferenceId = await assertCanReviewApplication(ctx, review.application);

			const reviewId = await setAssignmentReview(conferenceId, review);
			// An upsert: the first rating creates the row.
			assignmentReviewPubsub.created();
			assignmentReviewPubsub.updated(reviewId);

			return db.query.assignmentReview
				.findFirst(query(await readableById(ctx.abilities.assignmentReview, reviewId)))
				.then(assertFindFirstExists);
		}
	}),

	setAssignmentWeights: t.drizzleField({
		type: AssignmentWeightsRef,
		args: {
			conferenceId: t.arg.id({ required: true }),
			nullRating: t.arg.float({ required: true }),
			ratingFactor: t.arg.float({ required: true }),
			markBonus: t.arg.float({ required: true }),
			markEffect: t.arg({ type: markEffectEnum, required: true }),
			experienceModifier: t.arg.float({ required: true }),
			experienceEffect: t.arg({ type: experienceEffectEnum, required: true })
		},
		resolve: async (query, _root, { conferenceId, ...weights }, ctx) => {
			await assertCanPlanAssignment(ctx, conferenceId);
			const weightsId = await setAssignmentWeights(conferenceId, weights);
			assignmentWeightsPubsub.created();
			assignmentWeightsPubsub.updated(weightsId);

			return db.query.assignmentWeights
				.findFirst(query(await readableById(ctx.abilities.assignmentWeights, weightsId)))
				.then(assertFindFirstExists);
		}
	}),

	/** Plans a nation or non-state actor, or (without a role) none, for a whole delegation. */
	assignDelegation: t.field({
		type: 'Boolean',
		args: {
			delegationId: t.arg.id({ required: true }),
			roleId: t.arg.id({ required: false })
		},
		resolve: async (_root, args, ctx) => {
			const delegation = await assertCanAssignDelegation(ctx, args.delegationId);
			const target = targetFrom(args);
			await assertTargetOf(delegation.conferenceId, target);
			await draftDelegationTarget(db, delegation, target);
			publishDraft();
			return true;
		}
	}),

	/** Plans a role for one part of a split delegation or a converted single participant. */
	assignAssignmentUnit: t.field({
		type: 'Boolean',
		args: {
			unitId: t.arg.id({ required: true }),
			roleId: t.arg.id({ required: false })
		},
		resolve: async (_root, args, ctx) => {
			const unit = await assertCanAssignUnit(ctx, args.unitId);
			const target = targetFrom(args);
			await assertTargetOf(unit.conferenceId, target);
			await draftUnitTarget(unit.id, target);
			publishDraft();
			return true;
		}
	}),

	/** Splits a delegation into parts, each to be assigned on its own. Replaces an earlier split. */
	splitDelegation: t.field({
		type: 'Boolean',
		args: {
			delegationId: t.arg.id({ required: true }),
			parts: t.arg({ type: [SplitPartInput], required: true })
		},
		resolve: async (_root, args, ctx) => {
			const delegation = await assertCanAssignDelegation(ctx, args.delegationId);
			const parts = splitParts(args.parts, delegation.members.length);
			assertSplitMembersOf(delegation, parts);
			await splitDelegation(delegation, parts);
			publishDraft();
			return true;
		}
	}),

	/** Drops a delegation's split, and with it the roles planned for its parts. */
	undoDelegationSplit: t.field({
		type: 'Boolean',
		args: { delegationId: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			const delegation = await assertCanAssignDelegation(ctx, args.delegationId);
			await undoDelegationSplit(delegation.id);
			publishDraft();
			return true;
		}
	}),

	/** Plans to turn a single participant into a delegation of their own, to give it a nation. */
	convertSingleParticipant: t.field({
		type: 'Boolean',
		args: { singleParticipantId: t.arg.id({ required: true }) },
		resolve: singleParticipantDraftChange(convertSingleParticipant)
	}),

	revertSingleParticipantConversion: t.field({
		type: 'Boolean',
		args: { singleParticipantId: t.arg.id({ required: true }) },
		resolve: singleParticipantDraftChange((participant) =>
			revertSingleParticipantConversion(participant.id)
		)
	}),

	/** Plans a custom role for a single participant, or (without one) none. */
	assignSingleParticipantRole: t.field({
		type: 'Boolean',
		args: {
			singleParticipantId: t.arg.id({ required: true }),
			roleId: t.arg.id({ required: false })
		},
		resolve: async (_root, args, ctx) => {
			const participant = await assertCanAssignSingleParticipant(ctx, args.singleParticipantId);
			const roleId = args.roleId || null;
			await assertCustomRoleOf(participant.conferenceId, roleId);
			await planSingleParticipantRole(participant, roleId);
			publishDraft();
			return true;
		}
	}),

	/**
	 * Gives the unassigned groups of one size the roles with exactly that many free seats, at the
	 * lowest cost by their wishes, ratings, flags and experience. Groups without a wish get the roles left
	 * over. Returns how many groups got a role.
	 */
	autoAssignDelegations: t.field({
		type: 'Int',
		args: { conferenceId: t.arg.id({ required: true }), size: t.arg.int({ required: true }) },
		resolve: async (_root, args, ctx) => {
			await assertCanPlanAssignment(ctx, args.conferenceId);
			const assigned = await autoAssignDelegations(args.conferenceId, args.size);
			publishDraft();
			return assigned;
		}
	}),

	/**
	 * Gives the single participants without a role one of the custom roles they applied for, at the
	 * lowest cost by their ratings, flags and experience. Roles planned by hand stay and use up their
	 * seats; nobody gets a role they did not apply for. Returns how many got a role.
	 */
	autoAssignSingleParticipants: t.field({
		type: 'Int',
		args: { conferenceId: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			await assertCanPlanAssignment(ctx, args.conferenceId);
			const assigned = await autoAssignSingleParticipants(args.conferenceId);
			publishDraft();
			return assigned;
		}
	}),

	/** Takes the planned roles of the given seat count away again, to assign them anew. */
	resetAssignmentSize: t.field({
		type: 'Boolean',
		args: { conferenceId: t.arg.id({ required: true }), seats: t.arg.int({ required: true }) },
		resolve: async (_root, args, ctx) => {
			await assertCanPlanAssignment(ctx, args.conferenceId);
			await resetAssignmentSize(args.conferenceId, args.seats);
			publishDraft();
			return true;
		}
	}),

	/** Throws the planned changes away. Ratings and weights stay. */
	discardAssignmentDraft: t.field({
		type: 'Boolean',
		args: { conferenceId: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			await assertCanPlanAssignment(ctx, args.conferenceId);
			await discardAssignmentDraft(args.conferenceId);
			publishDraft();
			return true;
		}
	}),

	/**
	 * Writes the draft into the registrations in one transaction: splits, merges, roles and
	 * converted single participants. Refuses, changing nothing, while the draft has problems.
	 * Whether participants see the result is `conference.assignmentReleased`'s business.
	 */
	applyAssignment: t.field({
		type: 'Boolean',
		args: { conferenceId: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			await assertCanPlanAssignment(ctx, args.conferenceId);
			await applyAssignmentDraft(args.conferenceId);

			publishDraft();
			// Delegations are created and dissolved, members move, single participants become
			// delegates; reviews of dissolved delegations go with them.
			for (const pubsub of [
				delegationPubsub,
				delegationMemberPubsub,
				singleParticipantPubsub,
				assignmentReviewPubsub
			]) {
				pubsub.created();
				pubsub.removed();
				pubsub.updated();
			}
			scheduleEmailSweep(args.conferenceId, ctx.requestUrl().origin);
			return true;
		}
	}),

	/**
	 * Shows participants their assigned roles, or hides them again. Releasing with `sendEmails`
	 * sends the result mails now (`true`) or skips them (`false`); see `setAssignmentReleased`.
	 */
	setAssignmentReleased: t.field({
		type: 'Boolean',
		args: {
			conferenceId: t.arg.id({ required: true }),
			released: t.arg.boolean({ required: true }),
			sendEmails: t.arg.boolean()
		},
		resolve: async (_root, args, ctx) => {
			await assertCanReleaseAssignment(ctx, args.conferenceId, args.sendEmails != null);
			await setAssignmentReleased(args.conferenceId, args.released, args.sendEmails ?? undefined);

			conferencePubsub.updated(args.conferenceId);
			// What participants may read of these changes with the flag.
			delegationPubsub.updated();
			delegationMemberPubsub.updated();
			singleParticipantPubsub.updated();
			if (args.sendEmails) conferenceEmailSettingPubsub.updated();
			scheduleEmailSweep(args.conferenceId, ctx.requestUrl().origin);
			return true;
		}
	})
}));
