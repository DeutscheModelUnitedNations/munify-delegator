import { db, schema } from '$api/db/db';
import {
	abilityBuilder,
	enum_,
	object,
	pubsub as rumblePubsub,
	query,
	schemaBuilder
} from '$api/rumble';
import {
	PARTICIPANT_CARE_ROLES,
	assertTeamRole,
	isTeamMemberOfConference,
	systemAdmin,
	where
} from '$api/services/authHelper';
import { loadExperiencedIds } from '$api/services/assignmentExperience';
import {
	applyAssignmentDraft,
	assertTargetOf,
	draftDelegationTarget,
	loadAssignmentInput
} from '$api/services/assignmentDraft';
import { DEFAULT_WEIGHTS, autoAssign, autoAssignSingles } from '$lib/assignment/autoAssign';
import { experienceShare } from '$lib/assignment/experience';
import { reviewProblem, reviewRow } from '$lib/assignment/review';
import {
	assignmentGroups,
	singleRoles,
	targetKey,
	type AssignmentGroup,
	type Target
} from '$lib/assignment/state';
import { assertFindFirstExists } from '@m1212e/rumble';
import { eq } from 'drizzle-orm';
import { GraphQLError } from 'graphql';

/*
 * The assignment draft is the team's working copy: project management and participant care plan
 * who gets which role here, and nobody else sees any of it.
 */
const assignmentTeam = (ctx: Parameters<typeof isTeamMemberOfConference>[0]) =>
	where(isTeamMemberOfConference(ctx, PARTICIPANT_CARE_ROLES));

abilityBuilder.assignmentReview.allow(['read', 'update', 'delete']).when(systemAdmin);
abilityBuilder.assignmentReview.allow(['read', 'update', 'delete']).when(assignmentTeam);
abilityBuilder.assignmentUnit.allow(['read', 'update', 'delete']).when(systemAdmin);
abilityBuilder.assignmentUnit.allow(['read', 'update', 'delete']).when(assignmentTeam);
abilityBuilder.assignmentUnitMember.allow(['read', 'update', 'delete']).when(systemAdmin);
abilityBuilder.assignmentUnitMember.allow(['read', 'update', 'delete']).when(assignmentTeam);
abilityBuilder.assignmentSingleRole.allow(['read', 'update', 'delete']).when(systemAdmin);
abilityBuilder.assignmentSingleRole.allow(['read', 'update', 'delete']).when(assignmentTeam);
abilityBuilder.assignmentWeights.allow(['read', 'update', 'delete']).when(systemAdmin);
abilityBuilder.assignmentWeights.allow(['read', 'update', 'delete']).when(assignmentTeam);

const AssignmentReviewRef = object({ table: 'assignmentReview' });
query({ table: 'assignmentReview' });
object({ table: 'assignmentUnit' });
query({ table: 'assignmentUnit' });
object({ table: 'assignmentUnitMember' });
query({ table: 'assignmentUnitMember' });
object({ table: 'assignmentSingleRole' });
query({ table: 'assignmentSingleRole' });
const AssignmentWeightsRef = object({ table: 'assignmentWeights' });
query({ table: 'assignmentWeights' });

const markEffectEnum = enum_({ tsName: 'assignmentMarkEffect' });
const experienceEffectEnum = enum_({ tsName: 'assignmentExperienceEffect' });

const reviewPubsub = rumblePubsub({ table: 'assignmentReview' });
const unitPubsub = rumblePubsub({ table: 'assignmentUnit' });
const unitMemberPubsub = rumblePubsub({ table: 'assignmentUnitMember' });
const singleRolePubsub = rumblePubsub({ table: 'assignmentSingleRole' });
const weightsPubsub = rumblePubsub({ table: 'assignmentWeights' });
// Applying rewrites the registrations themselves.
const conferencePubsub = rumblePubsub({ table: 'conference' });
const delegationPubsub = rumblePubsub({ table: 'delegation' });
const delegationMemberPubsub = rumblePubsub({ table: 'delegationMember' });
const singleParticipantPubsub = rumblePubsub({ table: 'singleParticipant' });

/**
 * Every draft table changed. A draft write creates, changes and deletes rows in one go, and the
 * board's lists only hear about rows coming and going, so all three are announced.
 */
function publishDraft() {
	for (const pubsub of [unitPubsub, unitMemberPubsub, singleRolePubsub]) {
		pubsub.created();
		pubsub.removed();
		pubsub.updated();
	}
}

const SplitPartInput = schemaBuilder.inputType('AssignmentSplitPartInput', {
	fields: (t) => ({ memberIds: t.idList({ required: true }) })
});

const targetFrom = (args: {
	nationAlpha3Code?: string | null;
	nonStateActorId?: string | null;
}): Target => ({
	nationAlpha3Code: args.nationAlpha3Code || null,
	nonStateActorId: args.nonStateActorId || null
});

/** An applied delegation of a conference the caller does assignments in. */
async function assignableDelegation(ctx: Parameters<typeof assertTeamRole>[0], id: string) {
	const delegation = await db.query.delegation
		.findFirst({
			where: { id, applied: true },
			columns: {
				id: true,
				conferenceId: true,
				assignedNationAlpha3Code: true,
				assignedNonStateActorId: true
			},
			with: { members: { columns: { id: true } } }
		})
		.then(assertFindFirstExists);
	await assertTeamRole(ctx, delegation.conferenceId, PARTICIPANT_CARE_ROLES);
	return {
		...delegation,
		liveTarget: {
			nationAlpha3Code: delegation.assignedNationAlpha3Code,
			nonStateActorId: delegation.assignedNonStateActorId
		}
	};
}

/** An applied single participant of a conference the caller does assignments in. */
async function assignableSingleParticipant(ctx: Parameters<typeof assertTeamRole>[0], id: string) {
	const participant = await db.query.singleParticipant
		.findFirst({
			where: { id, applied: true },
			columns: { id: true, conferenceId: true, assignedRoleId: true }
		})
		.then(assertFindFirstExists);
	await assertTeamRole(ctx, participant.conferenceId, PARTICIPANT_CARE_ROLES);
	return participant;
}

const REVIEW_PROBLEMS = {
	application: 'Name either a delegation or a single participant',
	evaluation: 'A rating lies between 0.5 and 5'
};

/** The unique column a review of each kind of application is upserted on. */
const reviewKey = {
	delegation: schema.assignmentReview.delegationId,
	single: schema.assignmentReview.singleParticipantId
};

/** The conference of the application a review is about, once the caller may assign there. */
async function applicationConference(
	ctx: Parameters<typeof assertTeamRole>[0],
	application: ReturnType<typeof reviewRow>['application']
) {
	const row =
		application.kind === 'delegation'
			? await assignableDelegation(ctx, application.id)
			: await assignableSingleParticipant(ctx, application.id);
	return row.conferenceId;
}

/** Plans `target` for a group, whether it is a whole delegation or a unit of its own. */
async function draftGroupTarget(conferenceId: string, group: AssignmentGroup, target: Target) {
	if (group.unitId && (group.part || group.singleParticipantId)) {
		await db
			.update(schema.assignmentUnit)
			.set({ nationAlpha3Code: target.nationAlpha3Code, nonStateActorId: target.nonStateActorId })
			.where(eq(schema.assignmentUnit.id, group.unitId));
		return;
	}
	if (!group.delegationId) return;
	await draftDelegationTarget(
		db,
		{ id: group.delegationId, conferenceId, liveTarget: group.liveTarget },
		target
	);
}

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
			note: t.arg.string({ required: false })
		},
		resolve: async (query, _root, args, ctx) => {
			const problem = reviewProblem(args);
			if (problem) throw new GraphQLError(REVIEW_PROBLEMS[problem]);
			const { application, keys, values } = reviewRow(args);
			const conferenceId = await applicationConference(ctx, application);

			const [row] = await db
				.insert(schema.assignmentReview)
				.values({ conferenceId, ...keys, ...values })
				.onConflictDoUpdate({ target: reviewKey[application.kind], set: values })
				.returning({ id: schema.assignmentReview.id });
			// An upsert: the first rating creates the row.
			reviewPubsub.created();
			reviewPubsub.updated(row.id);

			return db.query.assignmentReview
				.findFirst(
					query(
						(await ctx.abilities.assignmentReview.filter('read')).merge({
							where: { id: row.id }
						}).query.single
					)
				)
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
			await assertTeamRole(ctx, conferenceId, PARTICIPANT_CARE_ROLES);
			const [row] = await db
				.insert(schema.assignmentWeights)
				.values({ conferenceId, ...weights })
				.onConflictDoUpdate({ target: schema.assignmentWeights.conferenceId, set: weights })
				.returning({ id: schema.assignmentWeights.id });
			weightsPubsub.created();
			weightsPubsub.updated(row.id);

			return db.query.assignmentWeights
				.findFirst(
					query(
						(await ctx.abilities.assignmentWeights.filter('read')).merge({
							where: { id: row.id }
						}).query.single
					)
				)
				.then(assertFindFirstExists);
		}
	}),

	/** Plans a nation, a non-state actor or (with neither) no role for a whole delegation. */
	assignDelegation: t.field({
		type: 'Boolean',
		args: {
			delegationId: t.arg.id({ required: true }),
			nationAlpha3Code: t.arg.string({ required: false }),
			nonStateActorId: t.arg.string({ required: false })
		},
		resolve: async (_root, args, ctx) => {
			const delegation = await assignableDelegation(ctx, args.delegationId);
			const target = targetFrom(args);
			await assertTargetOf(db, delegation.conferenceId, target);
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
			nationAlpha3Code: t.arg.string({ required: false }),
			nonStateActorId: t.arg.string({ required: false })
		},
		resolve: async (_root, args, ctx) => {
			const unit = await db.query.assignmentUnit
				.findFirst(
					(await ctx.abilities.assignmentUnit.filter('update')).merge({
						where: { id: args.unitId }
					}).query.single
				)
				.then(assertFindFirstExists);
			const target = targetFrom(args);
			await assertTargetOf(db, unit.conferenceId, target);
			await db
				.update(schema.assignmentUnit)
				.set({ nationAlpha3Code: target.nationAlpha3Code, nonStateActorId: target.nonStateActorId })
				.where(eq(schema.assignmentUnit.id, unit.id));
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
			const delegation = await assignableDelegation(ctx, args.delegationId);
			const parts = args.parts.map((part) => part.memberIds).filter((ids) => ids.length > 0);
			const memberIds = new Set(delegation.members.map((member) => member.id));
			const named = parts.flat();
			if (parts.length < 2) throw new GraphQLError('A split needs at least two parts');
			if (named.length !== memberIds.size || new Set(named).size !== named.length) {
				throw new GraphQLError('Every member has to be in exactly one part');
			}
			if (named.some((id) => !memberIds.has(id))) {
				throw new GraphQLError('Only the delegation’s own members can be split off');
			}

			await db.transaction(async (tx) => {
				await tx
					.delete(schema.assignmentUnit)
					.where(eq(schema.assignmentUnit.sourceDelegationId, delegation.id));
				for (const part of parts) {
					const [unit] = await tx
						.insert(schema.assignmentUnit)
						.values({ conferenceId: delegation.conferenceId, sourceDelegationId: delegation.id })
						.returning({ id: schema.assignmentUnit.id });
					await tx.insert(schema.assignmentUnitMember).values(
						part.map((delegationMemberId) => ({
							conferenceId: delegation.conferenceId,
							unitId: unit.id,
							delegationMemberId
						}))
					);
				}
			});
			publishDraft();
			return true;
		}
	}),

	/** Drops a delegation's split, and with it the roles planned for its parts. */
	undoDelegationSplit: t.field({
		type: 'Boolean',
		args: { delegationId: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			const delegation = await assignableDelegation(ctx, args.delegationId);
			await db
				.delete(schema.assignmentUnit)
				.where(eq(schema.assignmentUnit.sourceDelegationId, delegation.id));
			publishDraft();
			return true;
		}
	}),

	/** Plans to turn a single participant into a delegation of their own, to give it a nation. */
	convertSingleParticipant: t.field({
		type: 'Boolean',
		args: { singleParticipantId: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			const participant = await assignableSingleParticipant(ctx, args.singleParticipantId);
			await db
				.insert(schema.assignmentUnit)
				.values({
					conferenceId: participant.conferenceId,
					sourceSingleParticipantId: participant.id
				})
				.onConflictDoNothing();
			publishDraft();
			return true;
		}
	}),

	revertSingleParticipantConversion: t.field({
		type: 'Boolean',
		args: { singleParticipantId: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			const participant = await assignableSingleParticipant(ctx, args.singleParticipantId);
			await db
				.delete(schema.assignmentUnit)
				.where(eq(schema.assignmentUnit.sourceSingleParticipantId, participant.id));
			publishDraft();
			return true;
		}
	}),

	/** Plans a custom role for a single participant, or (without one) none. */
	assignSingleParticipantRole: t.field({
		type: 'Boolean',
		args: {
			singleParticipantId: t.arg.id({ required: true }),
			roleId: t.arg.id({ required: false })
		},
		resolve: async (_root, args, ctx) => {
			const participant = await assignableSingleParticipant(ctx, args.singleParticipantId);
			const roleId = args.roleId || null;
			if (roleId) {
				await db.query.customConferenceRole
					.findFirst({
						where: { id: roleId, conferenceId: participant.conferenceId },
						columns: { id: true }
					})
					.then(assertFindFirstExists);
			}
			if (roleId === participant.assignedRoleId) {
				await db
					.delete(schema.assignmentSingleRole)
					.where(eq(schema.assignmentSingleRole.singleParticipantId, participant.id));
			} else {
				await db
					.insert(schema.assignmentSingleRole)
					.values({
						conferenceId: participant.conferenceId,
						singleParticipantId: participant.id,
						roleId
					})
					.onConflictDoUpdate({
						target: schema.assignmentSingleRole.singleParticipantId,
						set: { roleId }
					});
			}
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
			await assertTeamRole(ctx, args.conferenceId, PARTICIPANT_CARE_ROLES);
			const [{ input, roles }, weights, reviews, wishes, experiencedIds] = await Promise.all([
				loadAssignmentInput(db, args.conferenceId),
				db.query.assignmentWeights.findFirst({ where: { conferenceId: args.conferenceId } }),
				db.query.assignmentReview.findMany({ where: { conferenceId: args.conferenceId } }),
				db.query.roleApplication.findMany({
					where: { delegation: { conferenceId: args.conferenceId } },
					columns: { delegationId: true, nationId: true, nonStateActorId: true, rank: true }
				}),
				loadExperiencedIds(args.conferenceId)
			]);
			const { groups } = assignmentGroups(input.delegations, input.singleParticipants, input.units);
			const reviewByApplication = new Map(
				reviews.map((review) => [review.delegationId ?? review.singleParticipantId, review])
			);

			const matches = autoAssign({
				size: args.size,
				groups,
				roles,
				weights: weights ?? DEFAULT_WEIGHTS,
				experienceOf: (group) => experienceShare(group, experiencedIds),
				reviewOf: (group) =>
					reviewByApplication.get(group.delegationId ?? group.singleParticipantId ?? ''),
				wishRankOf: (group, target) =>
					wishes.find(
						(wish) =>
							wish.delegationId === group.delegationId &&
							targetKey({
								nationAlpha3Code: wish.nationId,
								nonStateActorId: wish.nonStateActorId
							}) === targetKey(target)
					)?.rank
			});
			for (const { group, target } of matches) {
				await draftGroupTarget(args.conferenceId, group, target);
			}
			publishDraft();
			return matches.length;
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
			await assertTeamRole(ctx, args.conferenceId, PARTICIPANT_CARE_ROLES);
			const [{ input }, weights, reviews, applicants, customRoles, experiencedIds] =
				await Promise.all([
					loadAssignmentInput(db, args.conferenceId),
					db.query.assignmentWeights.findFirst({ where: { conferenceId: args.conferenceId } }),
					db.query.assignmentReview.findMany({ where: { conferenceId: args.conferenceId } }),
					db.query.singleParticipant.findMany({
						where: { conferenceId: args.conferenceId, applied: true },
						columns: { id: true, assignedRoleId: true },
						with: { appliedForRoles: { columns: { id: true } } }
					}),
					db.query.customConferenceRole.findMany({
						where: { conferenceId: args.conferenceId },
						columns: { id: true, seatAmount: true }
					}),
					loadExperiencedIds(args.conferenceId)
				]);
			const { groups } = assignmentGroups(input.delegations, input.singleParticipants, input.units);
			const converted = new Set(groups.flatMap((group) => group.singleParticipantId ?? []));
			const singles = singleRoles(input.singleParticipants, input.draftSingleRoles, converted);

			const held = new Map<string, number>();
			for (const single of singles) {
				if (single.roleId) held.set(single.roleId, (held.get(single.roleId) ?? 0) + 1);
			}
			const reviewBySingle = new Map(
				reviews.flatMap((review) =>
					review.singleParticipantId ? [[review.singleParticipantId, review] as const] : []
				)
			);
			const applicantById = new Map(applicants.map((applicant) => [applicant.id, applicant]));

			const matches = autoAssignSingles({
				weights: weights ?? DEFAULT_WEIGHTS,
				roles: customRoles.map((role) => ({
					id: role.id,
					freeSeats: role.seatAmount - (held.get(role.id) ?? 0)
				})),
				candidates: singles
					.filter((single) => !single.roleId)
					.map((single) => ({
						id: single.singleParticipantId,
						wishedRoleIds: new Set(
							applicantById.get(single.singleParticipantId)?.appliedForRoles.map((r) => r.id)
						),
						review: reviewBySingle.get(single.singleParticipantId),
						experience: experiencedIds.has(single.singleParticipantId) ? 1 : 0
					}))
			});
			for (const { singleParticipantId, roleId } of matches) {
				if (roleId === applicantById.get(singleParticipantId)?.assignedRoleId) {
					await db
						.delete(schema.assignmentSingleRole)
						.where(eq(schema.assignmentSingleRole.singleParticipantId, singleParticipantId));
				} else {
					await db
						.insert(schema.assignmentSingleRole)
						.values({ conferenceId: args.conferenceId, singleParticipantId, roleId })
						.onConflictDoUpdate({
							target: schema.assignmentSingleRole.singleParticipantId,
							set: { roleId }
						});
				}
			}
			publishDraft();
			return matches.length;
		}
	}),

	/** Takes the planned roles of the given seat count away again, to assign them anew. */
	resetAssignmentSize: t.field({
		type: 'Boolean',
		args: { conferenceId: t.arg.id({ required: true }), seats: t.arg.int({ required: true }) },
		resolve: async (_root, args, ctx) => {
			await assertTeamRole(ctx, args.conferenceId, PARTICIPANT_CARE_ROLES);
			const { input, roles } = await loadAssignmentInput(db, args.conferenceId);
			const { groups } = assignmentGroups(input.delegations, input.singleParticipants, input.units);
			const ofSize = new Set(roles.filter((role) => role.seats === args.seats).map((r) => r.key));
			for (const group of groups) {
				if (ofSize.has(targetKey(group.target) ?? '')) {
					await draftGroupTarget(args.conferenceId, group, {
						nationAlpha3Code: null,
						nonStateActorId: null
					});
				}
			}
			publishDraft();
			return true;
		}
	}),

	/** Throws the planned changes away. Ratings and weights stay. */
	discardAssignmentDraft: t.field({
		type: 'Boolean',
		args: { conferenceId: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			await assertTeamRole(ctx, args.conferenceId, PARTICIPANT_CARE_ROLES);
			await db
				.delete(schema.assignmentUnit)
				.where(eq(schema.assignmentUnit.conferenceId, args.conferenceId));
			await db
				.delete(schema.assignmentSingleRole)
				.where(eq(schema.assignmentSingleRole.conferenceId, args.conferenceId));
			publishDraft();
			return true;
		}
	}),

	/**
	 * Writes the draft into the registrations in one transaction: splits, merges, roles and
	 * converted single participants. Refuses, changing nothing, while the draft has problems.
	 * Whether participants see the result is `setAssignmentReleased`'s business.
	 */
	applyAssignment: t.field({
		type: 'Boolean',
		args: { conferenceId: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			await assertTeamRole(ctx, args.conferenceId, PARTICIPANT_CARE_ROLES);
			await applyAssignmentDraft(args.conferenceId);

			publishDraft();
			// Delegations are created and dissolved, members move, single participants become
			// delegates; reviews of dissolved delegations go with them.
			for (const pubsub of [
				delegationPubsub,
				delegationMemberPubsub,
				singleParticipantPubsub,
				reviewPubsub
			]) {
				pubsub.created();
				pubsub.removed();
				pubsub.updated();
			}
			return true;
		}
	}),

	/** Shows participants their assigned roles, or hides them again. */
	setAssignmentReleased: t.field({
		type: 'Boolean',
		args: {
			conferenceId: t.arg.id({ required: true }),
			released: t.arg.boolean({ required: true })
		},
		resolve: async (_root, args, ctx) => {
			await assertTeamRole(ctx, args.conferenceId, PARTICIPANT_CARE_ROLES);
			await db
				.update(schema.conference)
				.set({
					assignmentReleased: args.released,
					assignmentReleasedAt: args.released ? new Date() : null
				})
				.where(eq(schema.conference.id, args.conferenceId));

			conferencePubsub.updated(args.conferenceId);
			// What participants may read of these changes with the flag.
			delegationPubsub.updated();
			delegationMemberPubsub.updated();
			singleParticipantPubsub.updated();
			return true;
		}
	})
}));
