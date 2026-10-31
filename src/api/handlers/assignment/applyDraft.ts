import { type Transaction, db, schema } from '#api/db/db';
import { lockConference } from '#api/db/lockConference';
import { makeEntryCode } from '#api/services/registration/entryCodeGenerator';
import {
	planApply,
	type ApplyError,
	type ApplyPlan,
	type DelegationRef
} from '#lib/assignment/applyPlan';
import { seatedRoles, seatsByKey } from '#lib/assignment/capacity';
import { m } from '#lib/paraglide/messages';
import { getFullTranslatedCountryNameFromISO3Code } from '#lib/utils/nationTranslationHelper.svelte.js';
import { eq, inArray } from 'drizzle-orm';
import { whereRows } from '#api/db/whereRows';
import { apiError } from '#api/services/errors';
import {
	assignmentReviewPubsub,
	assignmentSingleRolePubsub,
	assignmentUnitMemberPubsub,
	assignmentUnitPubsub,
	delegationMemberPubsub,
	delegationPubsub,
	singleParticipantPubsub
} from '#api/pubsub';

/**
 * Applying the assignment draft: `planApply` (`#lib/assignment/applyPlan`) works out what changes,
 * this file writes it into the live registrations in one transaction.
 */

type DbOrTx = Transaction | typeof db;

/** Resolves a plan's delegation reference, including the ones created while applying. */
type DelegationIdOf = (ref: DelegationRef) => string;

/**
 * Announces a change to every draft table. Draft writes create, change and delete rows at once, and
 * the board's lists only react to rows being created. Call it once the writes are committed.
 */
export function announceDraftChange() {
	for (const pubsub of [
		assignmentUnitPubsub,
		assignmentUnitMemberPubsub,
		assignmentSingleRolePubsub
	]) {
		pubsub.created();
	}
}

/** The conference's registrations, its draft and its roles, as `planApply` takes them. */
export async function loadAssignmentState({
	tx,
	conferenceId
}: {
	tx: DbOrTx;
	conferenceId: string;
}) {
	const [delegations, singleParticipants, units, draftSingleRoles, conference] = await Promise.all([
		tx.query.delegation.findMany({
			where: { conferenceId, applied: true },
			columns: { id: true, assignedRoleId: true },
			with: {
				members: { columns: { id: true, isHeadDelegate: true } },
				papers: { columns: { id: true }, limit: 1 }
			}
		}),
		tx.query.singleParticipant.findMany({
			where: { participant: { conferenceId }, applied: true },
			columns: { id: true, assignedRoleId: true }
		}),
		tx.query.assignmentUnit.findMany({
			where: { conferenceId },
			with: { members: { columns: { delegationMemberId: true } } }
		}),
		tx.query.assignmentSingleRole.findMany({
			where: { singleParticipant: { participant: { conferenceId } } },
			columns: { singleParticipantId: true, roleId: true }
		}),
		tx.query.conference.findFirst({
			where: { id: conferenceId },
			columns: { id: true },
			with: {
				committees: {
					columns: { numOfSeatsPerDelegation: true },
					with: { roles: { columns: { id: true } } }
				},
				roles: {
					columns: { id: true, kind: true, name: true, seatAmount: true },
					with: { nation: { columns: { alpha3Code: true } } }
				}
			}
		})
	]);
	if (!conference) throw apiError({ code: 'NOT_FOUND', message: m.conferenceNotFound() });

	const delegationRoles = seatedRoles({
		committees: conference.committees,
		nonStateActors: conference.roles.filter((role) => role.kind === 'NON_STATE_ACTOR')
	});
	return {
		/** Nations and non-state actors with their seats. */
		roles: delegationRoles,
		roleNames: new Map(
			conference.roles.map((role) => [
				role.id,
				role.nation
					? getFullTranslatedCountryNameFromISO3Code(role.nation.alpha3Code)
					: (role.name ?? '')
			])
		),
		input: {
			delegations: delegations.map((delegation) => ({
				id: delegation.id,
				roleId: delegation.assignedRoleId,
				members: delegation.members,
				hasPapers: delegation.papers.length > 0
			})),
			singleParticipants: singleParticipants.map((participant) => ({
				id: participant.id,
				roleId: participant.assignedRoleId
			})),
			units: units.map((unit) => ({
				id: unit.id,
				sourceDelegationId: unit.sourceDelegationId,
				sourceSingleParticipantId: unit.sourceSingleParticipantId,
				roleId: unit.roleId,
				memberIds: unit.members.map((member) => member.delegationMemberId)
			})),
			draftSingleRoles,
			seats: seatsByKey(delegationRoles),
			roleSeats: new Map(
				conference.roles.flatMap((role) =>
					role.kind === 'CUSTOM' ? [[role.id, role.seatAmount ?? 0]] : []
				)
			)
		}
	};
}

/** Deletes the conference's draft units and planned single roles. The caller announces it. */
export async function clearDraft({ tx, conferenceId }: { tx: Transaction; conferenceId: string }) {
	await tx
		.delete(schema.assignmentUnit)
		.where(whereRows({ table: schema.assignmentUnit, filter: { conferenceId } }));
	// A planned single role knows its conference only through the participant.
	const singleParticipantIds = tx
		.select({ id: schema.singleParticipant.id })
		.from(schema.singleParticipant)
		.innerJoin(
			schema.conferenceParticipant,
			eq(schema.conferenceParticipant.id, schema.singleParticipant.conferenceParticipantId)
		)
		.where(whereRows({ table: schema.conferenceParticipant, filter: { conferenceId } }));
	await tx
		.delete(schema.assignmentSingleRole)
		.where(inArray(schema.assignmentSingleRole.singleParticipantId, singleParticipantIds));
}

/**
 * Writes the draft into the registrations and clears it. Ratings and weights stay. Refuses with
 * `CONFLICT` while the draft has errors (an unfinished split, too many people for a role, a deleted
 * delegation's papers).
 */
export async function applyAssignmentDraft(conferenceId: string) {
	const plan = await db.transaction(async (tx) => {
		// Two applies at once would both plan from the same draft and create its delegations twice.
		await lockConference({ tx, conferenceId });
		const { input, roleNames } = await loadAssignmentState({ tx, conferenceId });
		const { plan, errors } = planApply(input);
		if (errors.length > 0) {
			throw apiError({ code: 'CONFLICT', message: describeApplyErrors({ errors, roleNames }) });
		}

		// The order matters: members can only move into delegations that exist, and a delegation is
		// deleted only once its members have left, since its members cascade with it.
		const delegationIdOf = await createDelegations({ tx, conferenceId, plan });
		await setDelegationRoles({ tx, plan, delegationIdOf });
		await moveMembers({ tx, plan, delegationIdOf });
		await convertSingleParticipants({ tx, conferenceId, plan, delegationIdOf });

		if (plan.deleteDelegations.length > 0) {
			await tx.delete(schema.delegation).where(
				whereRows({
					table: schema.delegation,
					filter: { conferenceId, id: { in: plan.deleteDelegations } }
				})
			);
		}
		for (const { singleParticipantId, roleId } of plan.singleRoles) {
			await tx
				.update(schema.singleParticipant)
				.set({ assignedRoleId: roleId })
				.where(whereRows({ table: schema.singleParticipant, filter: { id: singleParticipantId } }));
		}

		await clearDraft({ tx, conferenceId });
		return plan;
	});
	announceAppliedPlan(plan);
	return plan;
}

/**
 * Announces what applying wrote: the lists hear of delegations, members and singles coming and
 * going (reviews of deleted delegations go with them), the rows changed in place by their ids.
 */
export function announceAppliedPlan(plan: ApplyPlan) {
	for (const pubsub of [
		delegationPubsub,
		delegationMemberPubsub,
		singleParticipantPubsub,
		assignmentReviewPubsub
	]) {
		pubsub.created();
		pubsub.removed();
	}
	announceDraftChange();

	const deleted = new Set(plan.deleteDelegations);
	const changedDelegationIds = [
		...plan.clearTargets,
		// New delegations are announced as created.
		...plan.setTargets.flatMap(({ delegation }) =>
			'existing' in delegation ? [delegation.existing] : []
		)
	].filter((id) => !deleted.has(id));
	if (changedDelegationIds.length > 0) delegationPubsub.updated(changedDelegationIds);

	const changedMemberIds = [
		...plan.moveMembers.map((move) => move.memberId),
		...plan.resetCommittees
	];
	if (changedMemberIds.length > 0) delegationMemberPubsub.updated(changedMemberIds);

	const changedSingleIds = plan.singleRoles.map((single) => single.singleParticipantId);
	if (changedSingleIds.length > 0) singleParticipantPubsub.updated(changedSingleIds);
}

/** The plan's errors as one translated message, a line each. */
function describeApplyErrors({
	errors,
	roleNames
}: {
	errors: ApplyError[];
	roleNames: ReadonlyMap<string, string>;
}) {
	return errors
		.map((error) => {
			switch (error.type) {
				case 'incompleteSplit':
					return m.assignmentErrorIncompleteSplit({ count: error.memberIds.length });
				case 'overCapacity':
					return m.assignmentErrorOverCapacity({
						role: roleNames.get(error.target.roleId ?? '') ?? '',
						seats: error.seats,
						assigned: error.assigned
					});
				case 'deletesPapers':
					return m.assignmentErrorDeletesPapers();
			}
		})
		.join('\n');
}

/** Creates the plan's new delegations and returns how to look up a delegation's id. */
async function createDelegations({
	tx,
	conferenceId,
	plan
}: {
	tx: Transaction;
	conferenceId: string;
	plan: ApplyPlan;
}): Promise<DelegationIdOf> {
	const createdIds: string[] = [];
	for (const { copyFrom } of plan.newDelegations) {
		const texts = { motivation: true, experience: true } as const;
		const source =
			'delegationId' in copyFrom
				? await tx.query.delegation.findFirst({
						where: { id: copyFrom.delegationId },
						columns: texts
					})
				: await tx.query.singleParticipant.findFirst({
						where: { id: copyFrom.singleParticipantId },
						columns: texts
					});
		const [row] = await tx
			.insert(schema.delegation)
			.values({
				conferenceId,
				entryCode: makeEntryCode(),
				applied: true,
				motivation: source?.motivation,
				experience: source?.experience
			})
			.returning({ id: schema.delegation.id });
		createdIds.push(row.id);
	}
	return (ref) => ('existing' in ref ? ref.existing : createdIds[ref.created]);
}

/** Gives the delegations, new ones included, the roles the plan assigns them. */
async function setDelegationRoles({
	tx,
	plan,
	delegationIdOf
}: {
	tx: Transaction;
	plan: ApplyPlan;
	delegationIdOf: DelegationIdOf;
}) {
	// A role belongs to one delegation at a time, so roles moving away are cleared first.
	if (plan.clearTargets.length > 0) {
		await tx
			.update(schema.delegation)
			.set({ assignedRoleId: null })
			.where(whereRows({ table: schema.delegation, filter: { id: { in: plan.clearTargets } } }));
	}
	for (const { delegation, target } of plan.setTargets) {
		await tx
			.update(schema.delegation)
			.set({ assignedRoleId: target.roleId })
			.where(whereRows({ table: schema.delegation, filter: { id: delegationIdOf(delegation) } }));
	}
}

/** Moves members between delegations and unseats those whose role changes from their committee. */
async function moveMembers({
	tx,
	plan,
	delegationIdOf
}: {
	tx: Transaction;
	plan: ApplyPlan;
	delegationIdOf: DelegationIdOf;
}) {
	for (const move of plan.moveMembers) {
		await tx
			.update(schema.delegationMember)
			.set({ delegationId: delegationIdOf(move.to), isHeadDelegate: move.isHeadDelegate })
			.where(whereRows({ table: schema.delegationMember, filter: { id: move.memberId } }));
	}
	if (plan.resetCommittees.length > 0) {
		await tx
			.update(schema.delegationMember)
			.set({ assignedCommitteeId: null })
			.where(
				whereRows({ table: schema.delegationMember, filter: { id: { in: plan.resetCommittees } } })
			);
	}
}

/** Turns single participants into delegation members. Supervision stays with the person. */
async function convertSingleParticipants({
	tx,
	conferenceId,
	plan,
	delegationIdOf
}: {
	tx: Transaction;
	conferenceId: string;
	plan: ApplyPlan;
	delegationIdOf: DelegationIdOf;
}) {
	for (const conversion of plan.convertSingles) {
		const single = await tx.query.singleParticipant.findFirst({
			where: { id: conversion.singleParticipantId, participant: { conferenceId } },
			columns: { conferenceParticipantId: true }
		});
		// Withdrawn since the plan was read: applying the rest would leave its delegation short.
		if (!single) throw apiError({ code: 'CONFLICT', message: m.assignmentChangedWhileApplying() });
		// Delete first: a person holds one registration per conference.
		await tx.delete(schema.singleParticipant).where(
			whereRows({
				table: schema.singleParticipant,
				filter: { id: conversion.singleParticipantId }
			})
		);
		await tx.insert(schema.delegationMember).values({
			delegationId: delegationIdOf(conversion.to),
			conferenceParticipantId: single.conferenceParticipantId,
			isHeadDelegate: conversion.isHeadDelegate
		});
	}
}
