import { type Transaction, db, schema } from '#api/db/db';
import { apiError } from '#api/services/errors';
import { DEFAULT_WEIGHTS, autoAssign } from '#lib/assignment/autoAssign';
import { experienceShare } from './experience';
import type { ReviewUpdate } from './review';
import { assignmentGroups, singleRoles, type AssignmentGroup } from '#lib/assignment/state';
import { ASSIGNMENT_RESULT_KINDS } from '#lib/helpers/emailKinds';
import { m } from '#lib/paraglide/messages';
import { whereRows } from '#api/db/whereRows';
import { enabledKinds, setEmailKindsEnabled, skipOpenEmails } from '#api/handlers/email/emailSweep';
import {
	type DbOrTx,
	announceDraftChange,
	announceDraftWrite,
	clearDraft,
	loadAssignmentState
} from './applyDraft';
import {
	assignmentReviewPubsub,
	assignmentWeightsPubsub,
	conferencePubsub,
	delegationMemberPubsub,
	delegationPubsub,
	singleParticipantPubsub
} from '#api/pubsub';
import { loadExperiencedIds } from './loadExperiencedIds';
import { matchSingles } from './matching';

/**
 * Changes the given fields of the team's review of one application, creating it on the first
 * change. Refuses a change that leaves it both required and excluded. Returns its id.
 */
export async function upsertAssignmentReview({
	conferenceId,
	review: { application, keys, changes }
}: {
	conferenceId: string;
	review: ReviewUpdate;
}) {
	const id = await db.transaction(async (tx) => {
		const [row] = await tx
			.insert(schema.assignmentReview)
			.values({ conferenceId, ...keys, ...changes })
			.onConflictDoUpdate({
				target:
					application.kind === 'delegation'
						? schema.assignmentReview.delegationId
						: schema.assignmentReview.singleParticipantId,
				// `updatedAt` keeps the set from being empty when nothing changes.
				set: { ...changes, updatedAt: new Date() }
			})
			.returning({
				id: schema.assignmentReview.id,
				required: schema.assignmentReview.required,
				disqualified: schema.assignmentReview.disqualified
			});
		if (row.required && row.disqualified) {
			throw apiError({ code: 'INVALID_INPUT', message: m.assignmentReviewRequiredAndExcluded() });
		}
		return row.id;
	});
	// The review may be new.
	assignmentReviewPubsub.created();
	return id;
}

/**
 * Changes the given weights of the conference's automatic assignment, creating them (the others at
 * their defaults) on the first change. Returns their id.
 */
export async function upsertAssignmentWeights({
	conferenceId,
	weights
}: {
	conferenceId: string;
	weights: Partial<Omit<typeof schema.assignmentWeights.$inferInsert, 'id' | 'conferenceId'>>;
}) {
	const [row] = await db
		.insert(schema.assignmentWeights)
		.values({ conferenceId, ...weights })
		.onConflictDoUpdate({
			target: schema.assignmentWeights.conferenceId,
			set: { ...weights, updatedAt: new Date() }
		})
		.returning({ id: schema.assignmentWeights.id });
	assignmentWeightsPubsub.created();
	assignmentWeightsPubsub.updated(row.id);
	return row.id;
}

/**
 * Plans a role for a whole delegation. Planning the role it already holds removes the draft unit.
 * Refuses a split delegation: its parts are planned one by one.
 */
export async function planDelegationRole({
	tx = db,
	delegation,
	roleId
}: {
	tx?: DbOrTx;
	delegation: { id: string; conferenceId: string; assignedRoleId: string | null };
	roleId: string | null;
}) {
	const units = await tx.query.assignmentUnit.findMany({
		where: { sourceDelegationId: delegation.id },
		with: { members: { columns: { id: true }, limit: 1 } }
	});
	if (units.some((unit) => unit.members.length > 0)) {
		throw apiError({ code: 'CONFLICT', message: m.assignmentDelegationIsSplit() });
	}

	if (roleId === delegation.assignedRoleId) {
		await tx
			.delete(schema.assignmentUnit)
			.where(
				whereRows({ table: schema.assignmentUnit, filter: { sourceDelegationId: delegation.id } })
			);
		announceDraftWrite(tx);
		return;
	}
	const unit = units.at(0);
	if (unit) {
		await tx
			.update(schema.assignmentUnit)
			.set({ roleId })
			.where(whereRows({ table: schema.assignmentUnit, filter: { id: unit.id } }));
	} else {
		await tx.insert(schema.assignmentUnit).values({
			conferenceId: delegation.conferenceId,
			sourceDelegationId: delegation.id,
			roleId
		});
	}
	announceDraftWrite(tx);
}

/** Plans a role for one part of a split delegation or a converted single participant. */
export async function planUnitRole({
	tx = db,
	unitId,
	roleId
}: {
	tx?: DbOrTx;
	unitId: string;
	roleId: string | null;
}) {
	await tx
		.update(schema.assignmentUnit)
		.set({ roleId })
		.where(whereRows({ table: schema.assignmentUnit, filter: { id: unitId } }));
	announceDraftWrite(tx);
}

async function planGroupRole({
	tx,
	conferenceId,
	group,
	roleId
}: {
	tx: Transaction;
	conferenceId: string;
	group: AssignmentGroup;
	roleId: string | null;
}) {
	if (group.unitId && (group.part || group.singleParticipantId)) {
		await planUnitRole({ tx, unitId: group.unitId, roleId });
	} else if (group.delegationId) {
		await planDelegationRole({
			tx,
			delegation: {
				id: group.delegationId,
				conferenceId,
				assignedRoleId: group.liveTarget.roleId
			},
			roleId
		});
	}
}

/** Drops empty parts. Refuses fewer than two parts, or parts not naming every member exactly once. */
export function parseSplitParts({
	parts,
	memberCount
}: {
	parts: { memberIds: string[] }[];
	memberCount: number;
}) {
	const nonEmpty = parts.map((part) => part.memberIds).filter((ids) => ids.length > 0);
	if (nonEmpty.length < 2) {
		throw apiError({ code: 'INVALID_INPUT', message: m.assignmentSplitNeedsTwoParts() });
	}
	const memberIds = nonEmpty.flat();
	if (memberIds.length !== memberCount || new Set(memberIds).size !== memberIds.length) {
		throw apiError({ code: 'INVALID_INPUT', message: m.assignmentSplitEveryMemberOnce() });
	}
	return nonEmpty;
}

/** Replaces the delegation's draft with one unit per part. */
export async function splitDelegation({
	delegation,
	parts
}: {
	delegation: { id: string; conferenceId: string };
	parts: string[][];
}) {
	await db.transaction(async (tx) => {
		await tx
			.delete(schema.assignmentUnit)
			.where(
				whereRows({ table: schema.assignmentUnit, filter: { sourceDelegationId: delegation.id } })
			);
		for (const memberIds of parts) {
			const [unit] = await tx
				.insert(schema.assignmentUnit)
				.values({ conferenceId: delegation.conferenceId, sourceDelegationId: delegation.id })
				.returning({ id: schema.assignmentUnit.id });
			await tx
				.insert(schema.assignmentUnitMember)
				.values(memberIds.map((delegationMemberId) => ({ unitId: unit.id, delegationMemberId })));
		}
	});
	announceDraftChange();
}

/** Deletes the delegation's units, and with them the roles planned for its parts. */
export async function undoDelegationSplit(delegationId: string) {
	await db
		.delete(schema.assignmentUnit)
		.where(
			whereRows({ table: schema.assignmentUnit, filter: { sourceDelegationId: delegationId } })
		);
	announceDraftChange();
}

/** Plans to turn a single participant into a delegation of their own. */
export async function convertSingleParticipant(participant: { id: string; conferenceId: string }) {
	await db
		.insert(schema.assignmentUnit)
		.values({ conferenceId: participant.conferenceId, sourceSingleParticipantId: participant.id })
		.onConflictDoNothing();
	announceDraftChange();
}

export async function revertSingleParticipantConversion(singleParticipantId: string) {
	await db.delete(schema.assignmentUnit).where(
		whereRows({
			table: schema.assignmentUnit,
			filter: { sourceSingleParticipantId: singleParticipantId }
		})
	);
	announceDraftChange();
}

/** Plans a custom role for a single participant. Planning the role they hold removes the plan. */
export async function planSingleParticipantRole({
	tx = db,
	participant,
	roleId
}: {
	tx?: DbOrTx;
	participant: { id: string; assignedRoleId: string | null };
	roleId: string | null;
}) {
	if (roleId === participant.assignedRoleId) {
		await tx.delete(schema.assignmentSingleRole).where(
			whereRows({
				table: schema.assignmentSingleRole,
				filter: { singleParticipantId: participant.id }
			})
		);
		announceDraftWrite(tx);
		return;
	}
	await tx
		.insert(schema.assignmentSingleRole)
		.values({ singleParticipantId: participant.id, roleId })
		.onConflictDoUpdate({
			target: schema.assignmentSingleRole.singleParticipantId,
			set: { roleId }
		});
	announceDraftWrite(tx);
}

/** Everything both automatic assignments score with. */
async function loadScoringInput(conferenceId: string) {
	const [{ input, roles }, weights, reviews, experiencedIds] = await Promise.all([
		loadAssignmentState({ tx: db, conferenceId }),
		db.query.assignmentWeights.findFirst({ where: { conferenceId } }),
		db.query.assignmentReview.findMany({ where: { conferenceId } }),
		loadExperiencedIds(conferenceId)
	]);
	const { groups } = assignmentGroups({
		delegations: input.delegations,
		singleParticipants: input.singleParticipants,
		units: input.units
	});
	return {
		input,
		roles,
		groups,
		weights: weights ?? DEFAULT_WEIGHTS,
		reviews,
		experiencedIds
	};
}

/**
 * Plans roles for the unassigned groups of `size` people, using only roles with exactly that many
 * free seats. Returns how many groups got one.
 */
export async function autoAssignDelegations({
	conferenceId,
	size
}: {
	conferenceId: string;
	size: number;
}) {
	const [{ roles, groups, weights, reviews, experiencedIds }, wishes] = await Promise.all([
		loadScoringInput(conferenceId),
		db.query.roleApplication.findMany({
			where: { delegation: { conferenceId } },
			columns: { delegationId: true, roleId: true, rank: true }
		})
	]);
	const reviewByApplicationId = new Map(
		reviews.map((review) => [review.delegationId ?? review.singleParticipantId, review])
	);

	const matches = autoAssign({
		size,
		groups,
		roles,
		weights,
		experienceOf: (group) => experienceShare({ group, experiencedIds }),
		reviewOf: (group) =>
			reviewByApplicationId.get(group.delegationId ?? group.singleParticipantId ?? ''),
		wishRankOf: (group, target) =>
			wishes.find(
				(wish) => wish.delegationId === group.delegationId && wish.roleId === target.roleId
			)?.rank
	});
	await db.transaction(async (tx) => {
		for (const { group, target } of matches) {
			await planGroupRole({ tx, conferenceId, group, roleId: target.roleId });
		}
	});
	announceDraftChange();
	return matches.length;
}

/**
 * Plans a custom role for each single participant without one, choosing only among the roles they
 * applied for. Roles planned by hand stay. Returns how many got one.
 */
export async function autoAssignSingleParticipants(conferenceId: string) {
	const [{ input, groups, weights, reviews, experiencedIds }, applicants, customRoles] =
		await Promise.all([
			loadScoringInput(conferenceId),
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
	const singles = singleRoles({
		singleParticipants: input.singleParticipants,
		draft: input.draftSingleRoles,
		converted: new Set(groups.flatMap((group) => group.singleParticipantId ?? []))
	});

	const takenSeats = new Map<string, number>();
	for (const { roleId } of singles) {
		if (roleId) takenSeats.set(roleId, (takenSeats.get(roleId) ?? 0) + 1);
	}
	const reviewBySingleId = new Map(
		reviews.flatMap((review) =>
			review.singleParticipantId ? [[review.singleParticipantId, review] as const] : []
		)
	);
	const applicantById = new Map(applicants.map((applicant) => [applicant.id, applicant]));

	const matches = await matchSingles({
		weights,
		roles: customRoles.map((role) => ({
			id: role.id,
			freeSeats: (role.seatAmount ?? 0) - (takenSeats.get(role.id) ?? 0)
		})),
		candidates: singles
			.filter((single) => !single.roleId)
			.map(({ singleParticipantId: id }) => ({
				id,
				wishedRoleIds: new Set(applicantById.get(id)?.appliedForRoles.map((role) => role.id)),
				review: reviewBySingleId.get(id),
				experience: experiencedIds.has(id) ? 1 : 0
			}))
	});
	await db.transaction(async (tx) => {
		for (const { singleParticipantId: id, roleId } of matches) {
			await planSingleParticipantRole({
				tx,
				participant: { id, assignedRoleId: applicantById.get(id)?.assignedRoleId ?? null },
				roleId
			});
		}
	});
	announceDraftChange();
	return matches.length;
}

/** Unplans every role with `seats` seats, so they can be assigned anew. */
export async function resetAssignmentSize({
	conferenceId,
	seats
}: {
	conferenceId: string;
	seats: number;
}) {
	const { input, roles } = await loadAssignmentState({ tx: db, conferenceId });
	const { groups } = assignmentGroups({
		delegations: input.delegations,
		singleParticipants: input.singleParticipants,
		units: input.units
	});
	const roleIdsOfSize = new Set(roles.filter((role) => role.seats === seats).map((r) => r.key));
	await db.transaction(async (tx) => {
		for (const group of groups) {
			if (group.target.roleId && roleIdsOfSize.has(group.target.roleId)) {
				await planGroupRole({ tx, conferenceId, group, roleId: null });
			}
		}
	});
	announceDraftChange();
}

/** Deletes the draft. Ratings and weights stay. */
export async function discardAssignmentDraft(conferenceId: string) {
	await db.transaction((tx) => clearDraft({ tx, conferenceId }));
	announceDraftChange();
}

/**
 * Shows participants their roles, or hides them again. On release, `sendEmails` switches the result
 * mails on (`true`) or skips them (`false`); left out, the mail settings stay.
 */
export async function setAssignmentReleased({
	conferenceId,
	released,
	sendEmails
}: {
	conferenceId: string;
	released: boolean;
	sendEmails?: boolean;
}) {
	if (released && sendEmails === true) {
		await setEmailKindsEnabled({ conferenceId, kinds: ASSIGNMENT_RESULT_KINDS, enabled: true });
	}
	if (released && sendEmails === false) {
		const enabled = await enabledKinds(conferenceId);
		// Skipped before the flag is written, so no sweep can send them first.
		await skipOpenEmails({
			conferenceId,
			kinds: ASSIGNMENT_RESULT_KINDS.filter((kind) => enabled.has(kind)),
			asIf: { assignmentReleased: true }
		});
	}
	await db
		.update(schema.conference)
		.set({ assignmentReleased: released, assignmentReleasedAt: released ? new Date() : null })
		.where(whereRows({ table: schema.conference, filter: { id: conferenceId } }));
	conferencePubsub.updated(conferenceId);
	// The release flag changes which of their columns participants may read.
	const [delegations, members, singles] = await Promise.all([
		db.query.delegation.findMany({ where: { conferenceId }, columns: { id: true } }),
		db.query.delegationMember.findMany({
			where: { participant: { conferenceId } },
			columns: { id: true }
		}),
		db.query.singleParticipant.findMany({
			where: { participant: { conferenceId } },
			columns: { id: true }
		})
	]);
	const ids = (rows: { id: string }[]) => rows.map((row) => row.id);
	if (delegations.length > 0) delegationPubsub.updated(ids(delegations));
	if (members.length > 0) delegationMemberPubsub.updated(ids(members));
	if (singles.length > 0) singleParticipantPubsub.updated(ids(singles));
}
