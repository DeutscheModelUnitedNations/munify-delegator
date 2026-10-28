import { type Transaction, db, schema } from '#api/db/db.js';
import { apiError } from '#api/services/errors/apiError.js';
import { DEFAULT_WEIGHTS, autoAssign } from '#lib/assignment/autoAssign.js';
import { experienceShare } from '#lib/assignment/experience.js';
import type { reviewRow } from '#lib/assignment/review.js';
import {
	NO_TARGET,
	assignmentGroups,
	singleRoles,
	targetKey,
	type AssignmentGroup,
	type Target
} from '#lib/assignment/state.js';
import { ASSIGNMENT_RESULT_KINDS } from '#lib/helpers/emailKinds.js';
import { m } from '#lib/paraglide/messages.js';
import { eq } from 'drizzle-orm';
import {
	enabledKinds,
	setEmailKindsEnabled,
	skipOpenEmails
} from '#api/handlers/email/emailSweep.js';
import { clearDraft, draftDelegationTarget, loadAssignmentInput } from './assignmentDraft';
import { loadExperiencedIds } from './assignmentExperience';
import { matchSingles } from './matching';

/** The unique column a review of each kind of application is upserted on. */
const reviewKey = {
	delegation: schema.assignmentReview.delegationId,
	single: schema.assignmentReview.singleParticipantId
};

/** Records the team's rating of one application, replacing the previous one. Returns its id. */
export async function setAssignmentReview(
	conferenceId: string,
	{ application, keys, values }: ReturnType<typeof reviewRow>
) {
	const [row] = await db
		.insert(schema.assignmentReview)
		.values({ conferenceId, ...keys, ...values })
		.onConflictDoUpdate({ target: reviewKey[application.kind], set: values })
		.returning({ id: schema.assignmentReview.id });
	return row.id;
}

/** Stores the conference's weights for the automatic assignment. Returns their id. */
export async function setAssignmentWeights(
	conferenceId: string,
	weights: Omit<typeof schema.assignmentWeights.$inferInsert, 'id' | 'conferenceId'>
) {
	const [row] = await db
		.insert(schema.assignmentWeights)
		.values({ conferenceId, ...weights })
		.onConflictDoUpdate({ target: schema.assignmentWeights.conferenceId, set: weights })
		.returning({ id: schema.assignmentWeights.id });
	return row.id;
}

/** Plans `target` for a group, whether it is a whole delegation or a unit of its own. */
async function draftGroupTarget(
	tx: Transaction,
	conferenceId: string,
	group: AssignmentGroup,
	target: Target
) {
	if (group.unitId && (group.part || group.singleParticipantId)) {
		await draftUnitTarget(group.unitId, target, tx);
		return;
	}
	if (!group.delegationId) return;
	await draftDelegationTarget(
		tx,
		{ id: group.delegationId, conferenceId, liveTarget: group.liveTarget },
		target
	);
}

/** Plans `target` for one part of a split delegation or a converted single participant. */
export async function draftUnitTarget(
	unitId: string,
	target: Target,
	tx: Transaction | typeof db = db
) {
	await tx
		.update(schema.assignmentUnit)
		.set({ roleId: target.roleId })
		.where(eq(schema.assignmentUnit.id, unitId));
}

/**
 * The parts a split names, without empty ones. Refuses fewer than two parts and parts that do not
 * name every member exactly once.
 */
export function splitParts(parts: { memberIds: string[] }[], memberCount: number) {
	const nonEmpty = parts.map((part) => part.memberIds).filter((ids) => ids.length > 0);
	const named = nonEmpty.flat();
	if (nonEmpty.length < 2) throw apiError('INVALID_INPUT', m.assignmentSplitNeedsTwoParts());
	if (named.length !== memberCount || new Set(named).size !== named.length) {
		throw apiError('INVALID_INPUT', m.assignmentSplitEveryMemberOnce());
	}
	return nonEmpty;
}

/** Splits a delegation into parts, each to be assigned on its own. Replaces an earlier split. */
export async function splitDelegation(
	delegation: { id: string; conferenceId: string },
	parts: string[][]
) {
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
					unitId: unit.id,
					delegationMemberId
				}))
			);
		}
	});
}

/** Drops a delegation's split, and with it the roles planned for its parts. */
export async function undoDelegationSplit(delegationId: string) {
	await db
		.delete(schema.assignmentUnit)
		.where(eq(schema.assignmentUnit.sourceDelegationId, delegationId));
}

/** Plans to turn a single participant into a delegation of their own, to give it a nation. */
export async function convertSingleParticipant(participant: { id: string; conferenceId: string }) {
	await db
		.insert(schema.assignmentUnit)
		.values({
			conferenceId: participant.conferenceId,
			sourceSingleParticipantId: participant.id
		})
		.onConflictDoNothing();
}

export async function revertSingleParticipantConversion(singleParticipantId: string) {
	await db
		.delete(schema.assignmentUnit)
		.where(eq(schema.assignmentUnit.sourceSingleParticipantId, singleParticipantId));
}

/** Plans a custom role for a single participant, or (without one) none. */
export async function planSingleParticipantRole(
	participant: { id: string; assignedRoleId: string | null },
	roleId: string | null,
	tx: Transaction | typeof db = db
) {
	if (roleId === participant.assignedRoleId) {
		await tx
			.delete(schema.assignmentSingleRole)
			.where(eq(schema.assignmentSingleRole.singleParticipantId, participant.id));
	} else {
		await tx
			.insert(schema.assignmentSingleRole)
			.values({ singleParticipantId: participant.id, roleId })
			.onConflictDoUpdate({
				target: schema.assignmentSingleRole.singleParticipantId,
				set: { roleId }
			});
	}
}

/**
 * What both auto-assignments score with: the live rows and the draft, the team's weights (the
 * defaults until they set their own), every rating and who has been to a conference before.
 */
async function loadScoringBasis(conferenceId: string) {
	const [{ input, roles }, weights, reviews, experiencedIds] = await Promise.all([
		loadAssignmentInput(db, conferenceId),
		db.query.assignmentWeights.findFirst({ where: { conferenceId } }),
		db.query.assignmentReview.findMany({ where: { conferenceId } }),
		loadExperiencedIds(conferenceId)
	]);
	return { input, roles, weights: weights ?? DEFAULT_WEIGHTS, reviews, experiencedIds };
}

/**
 * Gives the unassigned groups of one size the roles with exactly that many free seats, at the
 * lowest cost by their wishes, ratings, flags and experience. Groups without a wish get the roles left
 * over. Returns how many groups got a role.
 */
export async function autoAssignDelegations(conferenceId: string, size: number) {
	const [{ input, roles, weights, reviews, experiencedIds }, wishes] = await Promise.all([
		loadScoringBasis(conferenceId),
		db.query.roleApplication.findMany({
			where: { delegation: { conferenceId } },
			columns: { delegationId: true, roleId: true, rank: true }
		})
	]);
	const { groups } = assignmentGroups(input.delegations, input.singleParticipants, input.units);
	const reviewByApplication = new Map(
		reviews.map((review) => [review.delegationId ?? review.singleParticipantId, review])
	);

	const matches = autoAssign({
		size,
		groups,
		roles,
		weights,
		experienceOf: (group) => experienceShare(group, experiencedIds),
		reviewOf: (group) =>
			reviewByApplication.get(group.delegationId ?? group.singleParticipantId ?? ''),
		wishRankOf: (group, target) =>
			wishes.find(
				(wish) =>
					wish.delegationId === group.delegationId &&
					targetKey({ roleId: wish.roleId }) === targetKey(target)
			)?.rank
	});
	// One matching, so it is planned whole or not at all.
	await db.transaction(async (tx) => {
		for (const { group, target } of matches) {
			await draftGroupTarget(tx, conferenceId, group, target);
		}
	});
	return matches.length;
}

/**
 * Gives the single participants without a role one of the custom roles they applied for, at the
 * lowest cost by their ratings, flags and experience. Roles planned by hand stay and use up their
 * seats; nobody gets a role they did not apply for. Returns how many got a role.
 */
export async function autoAssignSingleParticipants(conferenceId: string) {
	const [{ input, weights, reviews, experiencedIds }, applicants, customRoles] = await Promise.all([
		loadScoringBasis(conferenceId),
		db.query.singleParticipant.findMany({
			where: { participant: { conferenceId }, applied: true },
			columns: { id: true, assignedRoleId: true },
			with: { appliedForRoles: { columns: { id: true } } }
		}),
		db.query.conferenceRole.findMany({
			where: { conferenceId, kind: 'CUSTOM' },
			columns: { id: true, seatAmount: true }
		})
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

	const matches = await matchSingles({
		weights,
		roles: customRoles.map((role) => ({
			id: role.id,
			freeSeats: (role.seatAmount ?? 0) - (held.get(role.id) ?? 0)
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
	// One matching, so it is planned whole or not at all.
	await db.transaction(async (tx) => {
		for (const { singleParticipantId, roleId } of matches) {
			await planSingleParticipantRole(
				{
					id: singleParticipantId,
					assignedRoleId: applicantById.get(singleParticipantId)?.assignedRoleId ?? null
				},
				roleId,
				tx
			);
		}
	});
	return matches.length;
}

/** Takes the planned roles of the given seat count away again, to assign them anew. */
export async function resetAssignmentSize(conferenceId: string, seats: number) {
	const { input, roles } = await loadAssignmentInput(db, conferenceId);
	const { groups } = assignmentGroups(input.delegations, input.singleParticipants, input.units);
	const ofSize = new Set(roles.filter((role) => role.seats === seats).map((r) => r.key));
	await db.transaction(async (tx) => {
		for (const group of groups) {
			if (ofSize.has(targetKey(group.target) ?? '')) {
				await draftGroupTarget(tx, conferenceId, group, NO_TARGET);
			}
		}
	});
}

/** Throws the planned changes away. Ratings and weights stay. */
export async function discardAssignmentDraft(conferenceId: string) {
	await db.transaction((tx) => clearDraft(tx, conferenceId));
}

/**
 * Shows participants their assigned roles, or hides them again. On release, `sendEmails` decides
 * about the result mails (acceptance, rejection, supervisor summary): `true` switches them on so
 * the next sweep sends them, `false` marks those switched on as skipped for everyone the release
 * reaches now, and leaving it out keeps the e-mail settings as they are.
 */
export async function setAssignmentReleased(
	conferenceId: string,
	released: boolean,
	sendEmails?: boolean
) {
	if (released && sendEmails === true) {
		await setEmailKindsEnabled(conferenceId, ASSIGNMENT_RESULT_KINDS, true);
	}
	if (released && sendEmails === false) {
		const enabled = await enabledKinds(conferenceId);
		// skipped as if released already, before the flag is written: no sweep can send them first
		await skipOpenEmails(
			conferenceId,
			ASSIGNMENT_RESULT_KINDS.filter((kind) => enabled.has(kind)),
			{ assignmentReleased: true }
		);
	}
	await db
		.update(schema.conference)
		.set({
			assignmentReleased: released,
			assignmentReleasedAt: released ? new Date() : null
		})
		.where(eq(schema.conference.id, conferenceId));
}
