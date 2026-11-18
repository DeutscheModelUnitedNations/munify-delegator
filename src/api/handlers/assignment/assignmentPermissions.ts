import { db } from '#api/db/db';
import { type ApiContext, abilityBuilder } from '#api/rumble';
import {
	assertTeamPermission,
	isTeamMemberOfConference,
	PARTICIPANT_CARE_ROLES,
	systemAdmin,
	teamConference,
	type RuleArgs,
	hop
} from '#api/services/authHelper/rules';
import { liveWhere } from '#api/services/authHelper/callerFacts';
import { apiError } from '#api/services/errors';
import type { ReviewedApplication } from './assignmentService';
import { m } from '#lib/paraglide/messages';
import { assertFindFirstExists } from '@m1212e/rumble';

/**
 * Matches draft rows of a conference where the caller is participant care (project management and
 * participant care), by the row's own `conferenceId`.
 */
const participantCareDraft = (args: RuleArgs) =>
	isTeamMemberOfConference({ ...args, roles: PARTICIPANT_CARE_ROLES });

export function registerAssignmentAbilities() {
	// The assignment draft (reviews, units, planned single roles, weights) is participant care's
	// alone: they read, update and delete it in their conference.
	const all = ['read', 'update', 'delete'] as const;
	abilityBuilder.assignmentReview.allow([...all]).when(systemAdmin);
	abilityBuilder.assignmentReview.allow([...all]).when(liveWhere(participantCareDraft));
	abilityBuilder.assignmentUnit.allow([...all]).when(systemAdmin);
	abilityBuilder.assignmentUnit.allow([...all]).when(liveWhere(participantCareDraft));
	abilityBuilder.assignmentUnitMember.allow([...all]).when(systemAdmin);
	// a unit member has no conference of its own: its unit's
	abilityBuilder.assignmentUnitMember.allow([...all]).when(
		liveWhere((args) => {
			const unit = participantCareDraft(args);
			return hop(unit, (unit) => ({ unit }));
		})
	);
	abilityBuilder.assignmentSingleRole.allow([...all]).when(systemAdmin);
	// nor has a planned single role: the single participant's part in the conference holds it
	abilityBuilder.assignmentSingleRole.allow([...all]).when(
		liveWhere((args) => {
			const participant = participantCareDraft(args);
			return hop(participant, (participant) => ({ singleParticipant: { participant } }));
		})
	);
	abilityBuilder.assignmentWeights.allow([...all]).when(systemAdmin);
	abilityBuilder.assignmentWeights.allow([...all]).when(liveWhere(participantCareDraft));
}

/** Refuses unless the caller holds `manageParticipants` (participant care) in the conference. */
export async function assertCanPlanAssignment({
	ctx,
	conferenceId
}: {
	ctx: ApiContext;
	conferenceId: string;
}) {
	await assertTeamPermission({ ctx, conferenceId, permission: 'manageParticipants' });
}

/**
 * Refuses (NOT_FOUND) unless the delegation has applied and the caller holds `manageParticipants`
 * in its conference. Returns it with its role and member ids.
 */
export async function assertCanAssignDelegation({ ctx, id }: { ctx: ApiContext; id: string }) {
	return db.query.delegation
		.findFirst({
			where: {
				id,
				applied: true,
				conference: await teamConference({ ctx, permission: 'manageParticipants' })
			},
			columns: { id: true, conferenceId: true, assignedRoleId: true },
			with: { members: { columns: { id: true } } }
		})
		.then(assertFindFirstExists);
}

/**
 * Refuses (NOT_FOUND) unless the single participant has applied and the caller holds
 * `manageParticipants` in its conference. Returns its id, role and conference.
 */
export async function assertCanAssignSingleParticipant({
	ctx,
	id
}: {
	ctx: ApiContext;
	id: string;
}) {
	const participant = await db.query.singleParticipant
		.findFirst({
			where: {
				id,
				applied: true,
				participant: { conference: await teamConference({ ctx, permission: 'manageParticipants' }) }
			},
			columns: { id: true, assignedRoleId: true },
			with: { participant: { columns: { conferenceId: true } } }
		})
		.then(assertFindFirstExists);
	return {
		id: participant.id,
		assignedRoleId: participant.assignedRoleId,
		conferenceId: participant.participant.conferenceId
	};
}

/**
 * Refuses unless the caller may assign the reviewed application (`assertCanAssignDelegation` /
 * `assertCanAssignSingleParticipant`). Returns its conference id.
 */
export async function assertCanReviewApplication({
	ctx,
	application
}: {
	ctx: ApiContext;
	application: ReviewedApplication;
}) {
	const row =
		application.kind === 'delegation'
			? await assertCanAssignDelegation({ ctx, id: application.id })
			: await assertCanAssignSingleParticipant({ ctx, id: application.id });
	return { conferenceId: row.conferenceId };
}

/** Refuses (NOT_FOUND) unless the caller's update ability reaches the draft unit. Returns it. */
export async function assertCanAssignUnit({ ctx, unitId }: { ctx: ApiContext; unitId: string }) {
	return db.query.assignmentUnit
		.findFirst(
			(await ctx.abilities.assignmentUnit.filter('update')).merge({ where: { id: unitId } }).query
				.single
		)
		.then(assertFindFirstExists);
}

/** Refuses (INVALID_INPUT) a split naming anyone who is not a member of the delegation. */
export function assertPartsAreOwnMembers({
	delegation,
	parts
}: {
	delegation: { members: { id: string }[] };
	parts: string[][];
}) {
	const memberIds = new Set(delegation.members.map((member) => member.id));
	if (parts.flat().some((id) => !memberIds.has(id))) {
		throw apiError({ code: 'INVALID_INPUT', message: m.assignmentSplitOnlyOwnMembers() });
	}
}
