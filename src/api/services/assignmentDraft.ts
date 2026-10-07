import { type Transaction, db, schema } from '$api/db/db';
import { makeEntryCode } from '$api/services/entryCodeGenerator';
import {
	planApply,
	type ApplyError,
	type ApplyPlan,
	type DelegationRef
} from '$lib/assignment/applyPlan';
import { seatedRoles, seatsByKey } from '$lib/assignment/capacity';
import { sameTarget, type Target } from '$lib/assignment/state';
import { m } from '$lib/paraglide/messages';
import { and, eq, inArray } from 'drizzle-orm';
import { GraphQLError } from 'graphql';

type Reader = Transaction | typeof db;

/** The registrations of a conference and the draft on top of them, as `planApply` takes them. */
export async function loadAssignmentInput(tx: Reader, conferenceId: string) {
	const [delegations, singleParticipants, units, draftSingleRoles, conference, roles] =
		await Promise.all([
			tx.query.delegation.findMany({
				where: { conferenceId, applied: true },
				columns: { id: true, assignedNationAlpha3Code: true, assignedNonStateActorId: true },
				with: {
					members: { columns: { id: true, isHeadDelegate: true } },
					papers: { columns: { id: true }, limit: 1 }
				}
			}),
			tx.query.singleParticipant.findMany({
				where: { conferenceId, applied: true },
				columns: { id: true, assignedRoleId: true }
			}),
			tx.query.assignmentUnit.findMany({
				where: { conferenceId },
				with: { members: { columns: { delegationMemberId: true } } }
			}),
			tx.query.assignmentSingleRole.findMany({
				where: { conferenceId },
				columns: { singleParticipantId: true, roleId: true }
			}),
			tx.query.conference.findFirst({
				where: { id: conferenceId },
				columns: { id: true },
				with: {
					committees: {
						columns: { abbreviation: true, numOfSeatsPerDelegation: true },
						with: { nations: { columns: { alpha2Code: true, alpha3Code: true } } }
					},
					nonStateActors: { columns: { id: true, seatAmount: true } }
				}
			}),
			tx.query.customConferenceRole.findMany({
				where: { conferenceId },
				columns: { id: true, seatAmount: true }
			})
		]);
	if (!conference) throw new GraphQLError('Conference not found');

	const seated = seatedRoles(conference.committees, conference.nonStateActors);
	return {
		roles: seated,
		input: {
			delegations: delegations.map((delegation) => ({
				id: delegation.id,
				nationAlpha3Code: delegation.assignedNationAlpha3Code,
				nonStateActorId: delegation.assignedNonStateActorId,
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
				nationAlpha3Code: unit.nationAlpha3Code,
				nonStateActorId: unit.nonStateActorId,
				memberIds: unit.members.map((member) => member.delegationMemberId)
			})),
			draftSingleRoles,
			seats: seatsByKey(seated),
			roleSeats: new Map(roles.map((role) => [role.id, role.seatAmount]))
		}
	};
}

/** Refuses a nation or non-state actor the conference does not offer. */
export async function assertTargetOf(tx: Reader, conferenceId: string, target: Target) {
	if (target.nationAlpha3Code && target.nonStateActorId) {
		throw new GraphQLError('A delegation holds either a nation or a non-state actor, not both');
	}
	if (target.nationAlpha3Code) {
		const offered = await tx.query.nation.findFirst({
			where: { alpha3Code: target.nationAlpha3Code, committees: { conferenceId } },
			columns: { alpha3Code: true }
		});
		if (!offered)
			throw new GraphQLError(`Nation ${target.nationAlpha3Code} is not of this conference`);
	}
	if (target.nonStateActorId) {
		const offered = await tx.query.nonStateActor.findFirst({
			where: { id: target.nonStateActorId, conferenceId },
			columns: { id: true }
		});
		if (!offered) {
			throw new GraphQLError(`Non-state actor ${target.nonStateActorId} is not of this conference`);
		}
	}
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
		throw new GraphQLError('This delegation is split; assign its parts instead');
	}
	if (sameTarget(target, delegation.liveTarget)) {
		await tx
			.delete(schema.assignmentUnit)
			.where(eq(schema.assignmentUnit.sourceDelegationId, delegation.id));
		return;
	}
	const values = {
		nationAlpha3Code: target.nationAlpha3Code,
		nonStateActorId: target.nonStateActorId
	};
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
function describeApplyErrors(errors: ApplyError[]) {
	return errors
		.map((error) => {
			switch (error.type) {
				case 'incompleteSplit':
					return m.assignmentErrorIncompleteSplit({ count: error.memberIds.length });
				case 'overCapacity':
					return m.assignmentErrorOverCapacity({
						role: error.target.nationAlpha3Code ?? error.target.nonStateActorId ?? '',
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
						columns: { school: true, motivation: true, experience: true }
					})
				: await tx.query.singleParticipant.findFirst({
						where: { id: copyFrom.singleParticipantId },
						columns: { school: true, motivation: true, experience: true }
					});
		const [row] = await tx
			.insert(schema.delegation)
			.values({
				conferenceId,
				entryCode: makeEntryCode(),
				applied: true,
				school: source?.school,
				motivation: source?.motivation,
				experience: source?.experience
			})
			.returning({ id: schema.delegation.id });
		created.push(row.id);
	}
	return (ref: DelegationRef) => ('existing' in ref ? ref.existing : created[ref.created]);
}

/** Single participants become members, keeping their supervisors, and stop being singles. */
async function convertSingles(
	tx: Transaction,
	conferenceId: string,
	plan: ApplyPlan,
	idOf: (ref: DelegationRef) => string
) {
	for (const conversion of plan.convertSingles) {
		const participant = await tx.query.singleParticipant.findFirst({
			where: { id: conversion.singleParticipantId, conferenceId },
			columns: { userId: true },
			with: { supervisors: { columns: { id: true } } }
		});
		if (!participant) continue;
		const [member] = await tx
			.insert(schema.delegationMember)
			.values({
				conferenceId,
				delegationId: idOf(conversion.to),
				userId: participant.userId,
				isHeadDelegate: conversion.isHeadDelegate
			})
			.returning({ id: schema.delegationMember.id });
		if (participant.supervisors.length > 0) {
			await tx
				.insert(schema.conferenceSupervisorToDelegationMember)
				.values(participant.supervisors.map((supervisor) => ({ a: supervisor.id, b: member.id })))
				.onConflictDoNothing();
		}
		await tx
			.delete(schema.singleParticipant)
			.where(eq(schema.singleParticipant.id, conversion.singleParticipantId));
	}
}

async function setTargets(tx: Transaction, plan: ApplyPlan, idOf: (ref: DelegationRef) => string) {
	// Every role belongs to one delegation per conference, so the roles moving away are cleared
	// before any is handed out again.
	if (plan.clearTargets.length > 0) {
		await tx
			.update(schema.delegation)
			.set({ assignedNationAlpha3Code: null, assignedNonStateActorId: null })
			.where(inArray(schema.delegation.id, plan.clearTargets));
	}
	for (const { delegation, target } of plan.setTargets) {
		await tx
			.update(schema.delegation)
			.set({
				assignedNationAlpha3Code: target.nationAlpha3Code,
				assignedNonStateActorId: target.nonStateActorId
			})
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

/**
 * Writes the draft into the registrations and clears it. The ratings and weights stay: they are
 * the team's notes, not part of the change.
 */
export async function applyAssignmentDraft(conferenceId: string) {
	return db.transaction(async (tx) => {
		const { input } = await loadAssignmentInput(tx, conferenceId);
		const { plan, errors } = planApply(input);
		if (errors.length > 0) throw new GraphQLError(describeApplyErrors(errors));

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

		await tx
			.delete(schema.assignmentUnit)
			.where(eq(schema.assignmentUnit.conferenceId, conferenceId));
		await tx
			.delete(schema.assignmentSingleRole)
			.where(eq(schema.assignmentSingleRole.conferenceId, conferenceId));

		return plan;
	});
}
