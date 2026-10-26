import { type Transaction, db, schema } from '#api/db/db.js';
import { makeEntryCode } from '#api/services/registration/entryCodeGenerator.js';
import {
	planApply,
	type ApplyError,
	type ApplyPlan,
	type DelegationRef
} from '#lib/assignment/applyPlan.js';
import { seatedRoles, seatsByKey } from '#lib/assignment/capacity.js';
import { sameTarget, type Target } from '#lib/assignment/state.js';
import { m } from '#lib/paraglide/messages.js';
import { getFullTranslatedCountryNameFromISO3Code } from '#lib/utils/nationTranslationHelper.svelte.js';
import { and, eq, inArray } from 'drizzle-orm';
import { apiError } from '#api/services/errors/apiError.js';

type Reader = Transaction | typeof db;

/**
 * The ids of a conference's single participants, as a subquery: a planned single role reaches its
 * conference only through the participant.
 */
function singleParticipantIdsOf(tx: Reader, conferenceId: string) {
	return tx
		.select({ id: schema.singleParticipant.id })
		.from(schema.singleParticipant)
		.innerJoin(
			schema.conferenceParticipant,
			eq(schema.conferenceParticipant.id, schema.singleParticipant.conferenceParticipantId)
		)
		.where(eq(schema.conferenceParticipant.conferenceId, conferenceId));
}

/** The registrations of a conference and the draft on top of them, as `planApply` takes them. */
export async function loadAssignmentInput(tx: Reader, conferenceId: string) {
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
	if (!conference) throw apiError('NOT_FOUND', m.conferenceNotFound());

	const roles = conference.roles;
	const seated = seatedRoles(
		conference.committees,
		roles.filter((role) => role.kind === 'NON_STATE_ACTOR')
	);
	return {
		roles: seated,
		roleNames: new Map(
			roles.map((role) => [
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
			seats: seatsByKey(seated),
			roleSeats: new Map(
				roles.flatMap((role) => (role.kind === 'CUSTOM' ? [[role.id, role.seatAmount ?? 0]] : []))
			)
		}
	};
}

/**
 * Plans for a whole delegation to end up with `target`: a unit when that differs from what it
 * holds, none when it does not. A split delegation is assigned through its parts instead.
 */
export async function draftDelegationTarget(
	tx: Reader,
	delegation: { id: string; conferenceId: string; liveTarget: Target },
	target: Target
) {
	const units = await tx.query.assignmentUnit.findMany({
		where: { sourceDelegationId: delegation.id },
		with: { members: { columns: { id: true }, limit: 1 } }
	});
	if (units.some((unit) => unit.members.length > 0)) {
		throw apiError('CONFLICT', m.assignmentDelegationIsSplit());
	}
	if (sameTarget(target, delegation.liveTarget)) {
		await tx
			.delete(schema.assignmentUnit)
			.where(eq(schema.assignmentUnit.sourceDelegationId, delegation.id));
		return;
	}
	const values = { roleId: target.roleId };
	const existing = units.at(0);
	if (existing) {
		await tx
			.update(schema.assignmentUnit)
			.set(values)
			.where(eq(schema.assignmentUnit.id, existing.id));
	} else {
		await tx.insert(schema.assignmentUnit).values({
			conferenceId: delegation.conferenceId,
			sourceDelegationId: delegation.id,
			...values
		});
	}
}

/** One readable line per problem, for the error the team sees when applying is refused. */
function describeApplyErrors(errors: ApplyError[], roleNames: ReadonlyMap<string, string>) {
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

async function createDelegations(tx: Transaction, conferenceId: string, plan: ApplyPlan) {
	const created: string[] = [];
	for (const { copyFrom } of plan.newDelegations) {
		const source =
			'delegationId' in copyFrom
				? await tx.query.delegation.findFirst({
						where: { id: copyFrom.delegationId },
						columns: { schoolId: true, motivation: true, experience: true }
					})
				: await tx.query.singleParticipant.findFirst({
						where: { id: copyFrom.singleParticipantId },
						columns: { schoolId: true, motivation: true, experience: true }
					});
		const [row] = await tx
			.insert(schema.delegation)
			.values({
				conferenceId,
				entryCode: makeEntryCode(),
				applied: true,
				schoolId: source?.schoolId,
				motivation: source?.motivation,
				experience: source?.experience
			})
			.returning({ id: schema.delegation.id });
		created.push(row.id);
	}
	return (ref: DelegationRef) => ('existing' in ref ? ref.existing : created[ref.created]);
}

/**
 * Single participants become members and stop being singles. Their supervisors stay: supervision
 * hangs on the person (`conferenceParticipant`), not on the registration.
 */
async function convertSingles(
	tx: Transaction,
	conferenceId: string,
	plan: ApplyPlan,
	idOf: (ref: DelegationRef) => string
) {
	for (const conversion of plan.convertSingles) {
		const participant = await tx.query.singleParticipant.findFirst({
			where: { id: conversion.singleParticipantId, participant: { conferenceId } },
			columns: { conferenceParticipantId: true }
		});
		if (!participant) continue;
		// The single row goes first: a person holds one registration per conference.
		await tx
			.delete(schema.singleParticipant)
			.where(eq(schema.singleParticipant.id, conversion.singleParticipantId));
		await tx.insert(schema.delegationMember).values({
			delegationId: idOf(conversion.to),
			conferenceParticipantId: participant.conferenceParticipantId,
			isHeadDelegate: conversion.isHeadDelegate
		});
	}
}

async function setTargets(tx: Transaction, plan: ApplyPlan, idOf: (ref: DelegationRef) => string) {
	// Every role belongs to one delegation per conference, so the roles moving away are cleared
	// before any is handed out again.
	if (plan.clearTargets.length > 0) {
		await tx
			.update(schema.delegation)
			.set({ assignedRoleId: null })
			.where(inArray(schema.delegation.id, plan.clearTargets));
	}
	for (const { delegation, target } of plan.setTargets) {
		await tx
			.update(schema.delegation)
			.set({ assignedRoleId: target.roleId })
			.where(eq(schema.delegation.id, idOf(delegation)));
	}
}

async function moveMembers(tx: Transaction, plan: ApplyPlan, idOf: (ref: DelegationRef) => string) {
	for (const move of plan.moveMembers) {
		await tx
			.update(schema.delegationMember)
			.set({ delegationId: idOf(move.to), isHeadDelegate: move.isHeadDelegate })
			.where(eq(schema.delegationMember.id, move.memberId));
	}
	if (plan.resetCommittees.length > 0) {
		await tx
			.update(schema.delegationMember)
			.set({ assignedCommitteeId: null })
			.where(inArray(schema.delegationMember.id, plan.resetCommittees));
	}
}

/** Removes the conference's planned changes: its units (with their members) and single roles. */
export async function clearDraft(tx: Transaction, conferenceId: string) {
	await tx
		.delete(schema.assignmentUnit)
		.where(eq(schema.assignmentUnit.conferenceId, conferenceId));
	await tx
		.delete(schema.assignmentSingleRole)
		.where(
			inArray(
				schema.assignmentSingleRole.singleParticipantId,
				singleParticipantIdsOf(tx, conferenceId)
			)
		);
}

/**
 * Writes the draft into the registrations and clears it. The ratings and weights stay: they are
 * the team's notes, not part of the change.
 */
export async function applyAssignmentDraft(conferenceId: string) {
	return db.transaction(async (tx) => {
		const { input, roleNames } = await loadAssignmentInput(tx, conferenceId);
		const { plan, errors } = planApply(input);
		if (errors.length > 0) throw apiError('CONFLICT', describeApplyErrors(errors, roleNames));

		const idOf = await createDelegations(tx, conferenceId, plan);
		await setTargets(tx, plan, idOf);
		await moveMembers(tx, plan, idOf);
		await convertSingles(tx, conferenceId, plan, idOf);

		if (plan.deleteDelegations.length > 0) {
			await tx
				.delete(schema.delegation)
				.where(
					and(
						eq(schema.delegation.conferenceId, conferenceId),
						inArray(schema.delegation.id, plan.deleteDelegations)
					)
				);
		}
		for (const { singleParticipantId, roleId } of plan.singleRoles) {
			await tx
				.update(schema.singleParticipant)
				.set({ assignedRoleId: roleId })
				.where(eq(schema.singleParticipant.id, singleParticipantId));
		}

		await clearDraft(tx, conferenceId);

		return plan;
	});
}
