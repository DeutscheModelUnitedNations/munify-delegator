import { z } from 'zod';
import { type Transaction, db, schema } from '#api/db/db';
import { apiError } from '#api/services/errors';
import { DEFAULT_WEIGHTS } from '#lib/assignment/weights';
import { autoAssign, experienceShare } from './autoAssign';
import { assignmentGroups, singleRoles, type AssignmentGroup } from '#lib/assignment/state';
import { m } from '#lib/paraglide/messages';
import { whereRows } from '#api/db/whereRows';
import { announceDraftChange, clearDraft, loadAssignmentState } from './applyDraft';
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

/** A flag is never null in the table: null leaves it as it is, like undefined. */
const flagChange = z
	.boolean()
	.nullish()
	.transform((flag) => flag ?? undefined);

/**
 * The arguments of `upsertAssignmentReview`, checked and turned into the columns it writes. Only
 * the fields given are changed; `null` clears the rating or the note.
 */
export const reviewArgsSchema = z
	.object({
		delegationId: z.string().nullish(),
		singleParticipantId: z.string().nullish(),
		evaluation: z
			.number()
			.min(0.5, { error: () => m.assignmentReviewRatingRange() })
			.max(5, { error: () => m.assignmentReviewRatingRange() })
			.nullish(),
		flagged: flagChange,
		disqualified: flagChange,
		/** Must get a seat. */
		required: flagChange,
		note: z
			.string()
			.nullish()
			.transform((note) => (note === undefined ? undefined : note || null))
	})
	.refine((args) => !args.delegationId !== !args.singleParticipantId, {
		error: () => m.assignmentReviewNameOneApplication()
	})
	.refine((args) => !(args.disqualified && args.required), {
		error: () => m.assignmentReviewRequiredAndExcluded()
	})
	.transform(({ delegationId, singleParticipantId, ...changes }) => ({
		application: delegationId
			? { kind: 'delegation' as const, id: delegationId }
			: { kind: 'single' as const, id: singleParticipantId ?? '' },
		keys: { delegationId: delegationId ?? null, singleParticipantId: singleParticipantId ?? null },
		changes
	}));

export type ReviewUpdate = z.output<typeof reviewArgsSchema>;
export type ReviewedApplication = ReviewUpdate['application'];

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
	assignmentReviewPubsub.updated(id);
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
 * Runs `write` in a transaction and announces the draft change once it is committed. The `write…`
 * helpers below only write, inside whatever transaction they are handed.
 */
async function changeDraft(write: (tx: Transaction) => Promise<unknown>) {
	await db.transaction(write);
	announceDraftChange();
}

/**
 * Makes concurrent writes to one delegation's units wait for each other, so a plan cannot read
 * them while a split or another plan replaces them.
 */
async function lockDelegationUnits({
	tx,
	delegationId
}: {
	tx: Transaction;
	delegationId: string;
}) {
	await tx
		.select({ id: schema.delegation.id })
		.from(schema.delegation)
		.where(whereRows({ table: schema.delegation, filter: { id: delegationId } }))
		// Not `update`: that would also block inserts of rows referencing the delegation.
		.for('no key update');
}

/** Deletes the delegation's units, with the roles planned for it or its parts. */
async function deleteDelegationUnits({
	tx,
	delegationId
}: {
	tx: Transaction;
	delegationId: string;
}) {
	await tx
		.delete(schema.assignmentUnit)
		.where(
			whereRows({ table: schema.assignmentUnit, filter: { sourceDelegationId: delegationId } })
		);
}

/** A delegation as planning needs it: `assignedRoleId` is the role it holds now. */
type PlannedDelegation = { id: string; conferenceId: string; assignedRoleId: string | null };

/**
 * Writes `planDelegationRole`'s plan: a whole-delegation unit with the role, or none when the
 * role is the one it holds. Refuses a split delegation.
 */
async function writeDelegationPlan({
	tx,
	delegation,
	roleId
}: {
	tx: Transaction;
	delegation: PlannedDelegation;
	roleId: string | null;
}) {
	await lockDelegationUnits({ tx, delegationId: delegation.id });
	const units = await tx.query.assignmentUnit.findMany({
		where: { sourceDelegationId: delegation.id },
		with: { members: { columns: { id: true }, limit: 1 } }
	});
	if (units.some((unit) => unit.members.length > 0)) {
		throw apiError({ code: 'CONFLICT', message: m.assignmentDelegationIsSplit() });
	}

	const unit = units.at(0);
	if (roleId === delegation.assignedRoleId) {
		await deleteDelegationUnits({ tx, delegationId: delegation.id });
	} else if (unit) {
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
}

/** Writes `planUnitRole`'s plan: the role of an existing unit. */
async function writeUnitPlan({
	tx,
	unitId,
	roleId
}: {
	tx: Transaction;
	unitId: string;
	roleId: string | null;
}) {
	await tx
		.update(schema.assignmentUnit)
		.set({ roleId })
		.where(whereRows({ table: schema.assignmentUnit, filter: { id: unitId } }));
}

/** A single participant as planning needs it: `assignedRoleId` is the role they hold now. */
type PlannedSingleParticipant = { id: string; assignedRoleId: string | null };

/**
 * Writes `planSingleParticipantRole`'s plan: the planned role, or none when the role is the one
 * they hold.
 */
async function writeSingleParticipantPlan({
	tx,
	participant,
	roleId
}: {
	tx: Transaction;
	participant: PlannedSingleParticipant;
	roleId: string | null;
}) {
	if (roleId === participant.assignedRoleId) {
		await tx.delete(schema.assignmentSingleRole).where(
			whereRows({
				table: schema.assignmentSingleRole,
				filter: { singleParticipantId: participant.id }
			})
		);
		return;
	}
	await tx
		.insert(schema.assignmentSingleRole)
		.values({ singleParticipantId: participant.id, roleId })
		.onConflictDoUpdate({
			target: schema.assignmentSingleRole.singleParticipantId,
			set: { roleId }
		});
}

/**
 * Plans a role for a group of the board: through its own unit for a part of a split delegation or
 * a converted single participant, otherwise for the whole delegation.
 */
async function writeGroupPlan({
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
		await writeUnitPlan({ tx, unitId: group.unitId, roleId });
	} else if (group.delegationId) {
		const delegation = {
			id: group.delegationId,
			conferenceId,
			assignedRoleId: group.liveTarget.roleId
		};
		await writeDelegationPlan({ tx, delegation, roleId });
	}
}

/**
 * Plans a role for a whole delegation. Planning the role it already holds removes the draft unit.
 * Refuses a split delegation: its parts are planned one by one.
 */
export function planDelegationRole(args: { delegation: PlannedDelegation; roleId: string | null }) {
	return changeDraft((tx) => writeDelegationPlan({ tx, ...args }));
}

/** Plans a role for one part of a split delegation or a converted single participant. */
export function planUnitRole(args: { unitId: string; roleId: string | null }) {
	return changeDraft((tx) => writeUnitPlan({ tx, ...args }));
}

/** Plans a custom role for a single participant. Planning the role they hold removes the plan. */
export function planSingleParticipantRole(args: {
	participant: PlannedSingleParticipant;
	roleId: string | null;
}) {
	return changeDraft((tx) => writeSingleParticipantPlan({ tx, ...args }));
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
export function splitDelegation({
	delegation,
	parts
}: {
	delegation: { id: string; conferenceId: string };
	parts: string[][];
}) {
	return changeDraft(async (tx) => {
		await lockDelegationUnits({ tx, delegationId: delegation.id });
		await deleteDelegationUnits({ tx, delegationId: delegation.id });
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
}

/** Deletes the delegation's units, and with them the roles planned for its parts. */
export function undoDelegationSplit(delegationId: string) {
	return changeDraft((tx) => deleteDelegationUnits({ tx, delegationId }));
}

/** Plans to turn a single participant into a delegation of their own. */
export function convertSingleParticipant(participant: { id: string; conferenceId: string }) {
	return changeDraft((tx) =>
		tx
			.insert(schema.assignmentUnit)
			.values({ conferenceId: participant.conferenceId, sourceSingleParticipantId: participant.id })
			.onConflictDoNothing()
	);
}

/** Drops the plan to turn a single participant into a delegation, with any role planned for it. */
export function revertSingleParticipantConversion(singleParticipantId: string) {
	return changeDraft((tx) =>
		tx.delete(schema.assignmentUnit).where(
			whereRows({
				table: schema.assignmentUnit,
				filter: { sourceSingleParticipantId: singleParticipantId }
			})
		)
	);
}

/** The conference's draft state and the board's groups built from it. */
async function loadGroups(conferenceId: string) {
	const { input, roles } = await loadAssignmentState({ tx: db, conferenceId });
	const { groups } = assignmentGroups({
		delegations: input.delegations,
		singleParticipants: input.singleParticipants,
		units: input.units
	});
	return { input, roles, groups };
}

/** The conference's weights, and who is experienced only when the weights count experience. */
async function loadWeightsAndExperience(conferenceId: string) {
	const weights =
		(await db.query.assignmentWeights.findFirst({ where: { conferenceId } })) ?? DEFAULT_WEIGHTS;
	const experiencedIds =
		weights.experienceModifier === 0 ? new Set<string>() : await loadExperiencedIds(conferenceId);
	return { weights, experiencedIds };
}

/** Everything both automatic assignments score with. */
async function loadScoringInput(conferenceId: string) {
	const [{ input, roles, groups }, { weights, experiencedIds }, reviews] = await Promise.all([
		loadGroups(conferenceId),
		loadWeightsAndExperience(conferenceId),
		db.query.assignmentReview.findMany({ where: { conferenceId } })
	]);
	const reviewByApplicationId = new Map(
		reviews.map((review) => [review.delegationId ?? review.singleParticipantId, review])
	);
	return {
		input,
		roles,
		groups,
		weights,
		/** The review of a delegation or single participant, by its id. */
		reviewOf: (applicationId: string) => reviewByApplicationId.get(applicationId),
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
	const [{ roles, groups, weights, reviewOf, experiencedIds }, wishes] = await Promise.all([
		loadScoringInput(conferenceId),
		db.query.roleApplication.findMany({
			where: { delegation: { conferenceId } },
			columns: { delegationId: true, roleId: true, rank: true }
		})
	]);
	/** One key per delegation and role it wished for. */
	const wishKey = (delegationId: string, roleId: string | null) => `${delegationId}:${roleId}`;
	const wishRanks = new Map(
		wishes.map((wish) => [wishKey(wish.delegationId, wish.roleId), wish.rank])
	);

	const matches = autoAssign({
		size,
		groups,
		roles,
		weights,
		experienceOf: (group) => experienceShare({ group, experiencedIds }),
		reviewOf: (group) => reviewOf(group.delegationId ?? group.singleParticipantId ?? ''),
		wishRankOf: (group, target) =>
			group.delegationId ? wishRanks.get(wishKey(group.delegationId, target.roleId)) : undefined
	});
	await changeDraft(async (tx) => {
		for (const { group, target } of matches) {
			await writeGroupPlan({ tx, conferenceId, group, roleId: target.roleId });
		}
	});
	return matches.length;
}

/** Counts how often each role id occurs; null counts for none. */
function countRoles(roleIds: (string | null)[]) {
	const counts = new Map<string, number>();
	for (const roleId of roleIds) {
		if (roleId) counts.set(roleId, (counts.get(roleId) ?? 0) + 1);
	}
	return counts;
}

/**
 * Plans a custom role for each single participant without one, choosing only among the roles they
 * applied for. Roles planned by hand stay. Returns how many got one.
 */
export async function autoAssignSingleParticipants(conferenceId: string) {
	const [{ input, groups, weights, reviewOf, experiencedIds }, applicants, customRoles] =
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
	const takenSeats = countRoles(singles.map((single) => single.roleId));
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
				review: reviewOf(id),
				experience: experiencedIds.has(id) ? 1 : 0
			}))
	});
	await changeDraft(async (tx) => {
		for (const { singleParticipantId: id, roleId } of matches) {
			const participant = { id, assignedRoleId: applicantById.get(id)?.assignedRoleId ?? null };
			await writeSingleParticipantPlan({ tx, participant, roleId });
		}
	});
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
	const { roles, groups } = await loadGroups(conferenceId);
	const roleIdsOfSize = new Set(roles.filter((role) => role.seats === seats).map((r) => r.key));
	const planned = groups.filter(
		(group) => group.target.roleId && roleIdsOfSize.has(group.target.roleId)
	);
	await changeDraft(async (tx) => {
		for (const group of planned) {
			await writeGroupPlan({ tx, conferenceId, group, roleId: null });
		}
	});
}

/** Deletes the draft. Ratings and weights stay. */
export function discardAssignmentDraft(conferenceId: string) {
	return changeDraft((tx) => clearDraft({ tx, conferenceId }));
}

/** Shows participants their roles, or hides them again. */
export async function setAssignmentReleased({
	conferenceId,
	released
}: {
	conferenceId: string;
	released: boolean;
}) {
	await db
		.update(schema.conference)
		.set({ assignmentReleased: released, assignmentReleasedAt: released ? new Date() : null })
		.where(whereRows({ table: schema.conference, filter: { id: conferenceId } }));
	conferencePubsub.updated(conferenceId);
	await announceReleaseVisibility(conferenceId);
}

/** Announces the rows whose readable columns the release flag decides. */
async function announceReleaseVisibility(conferenceId: string) {
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
	/** Announces the rows as updated, unless there are none. */
	const announce = (pubsub: { updated: (ids: string[]) => void }, rows: { id: string }[]) => {
		if (rows.length > 0) pubsub.updated(rows.map((row) => row.id));
	};
	announce(delegationPubsub, delegations);
	announce(delegationMemberPubsub, members);
	announce(singleParticipantPubsub, singles);
}
