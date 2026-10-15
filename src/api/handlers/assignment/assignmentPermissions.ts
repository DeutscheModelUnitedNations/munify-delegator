import { db } from '$api/db/db';
import { type ApiContext, abilityBuilder } from '$api/rumble';
import {
	PARTICIPANT_CARE_ROLES,
	assertCustomRolesOf,
	assertTeamRole,
	isTeamMemberOf,
	isTeamMemberOfConference,
	assertOfferedIn,
	systemAdmin,
	where
} from '$api/services/authHelper';
import { apiError } from '$api/services/errors/apiError';
import type { reviewRow } from '$lib/assignment/review';
import type { Target } from '$lib/assignment/state';
import { m } from '$lib/paraglide/messages';
import { assertFindFirstExists } from '@m1212e/rumble';

/*
 * The assignment draft is the team's working copy: project management and participant care plan
 * who gets which role here, and nobody else sees any of it.
 */
const assignmentTeam = (ctx: Parameters<typeof isTeamMemberOfConference>[0]) =>
	where(isTeamMemberOfConference(ctx, PARTICIPANT_CARE_ROLES));

/** The same for a planned single role, which reaches its conference through the participant. */
const singleRoleAssignmentTeam = (ctx: Parameters<typeof isTeamMemberOf>[0]) => {
	const conference = isTeamMemberOf(ctx, PARTICIPANT_CARE_ROLES);
	return conference === undefined ? undefined : { where: { singleParticipant: { conference } } };
};

export function registerAssignmentAbilities() {
	abilityBuilder.assignmentReview.allow(['read', 'update', 'delete']).when(systemAdmin);
	abilityBuilder.assignmentReview.allow(['read', 'update', 'delete']).when(assignmentTeam);
	abilityBuilder.assignmentUnit.allow(['read', 'update', 'delete']).when(systemAdmin);
	abilityBuilder.assignmentUnit.allow(['read', 'update', 'delete']).when(assignmentTeam);
	abilityBuilder.assignmentUnitMember.allow(['read', 'update', 'delete']).when(systemAdmin);
	abilityBuilder.assignmentUnitMember.allow(['read', 'update', 'delete']).when(assignmentTeam);
	abilityBuilder.assignmentSingleRole.allow(['read', 'update', 'delete']).when(systemAdmin);
	abilityBuilder.assignmentSingleRole
		.allow(['read', 'update', 'delete'])
		.when(singleRoleAssignmentTeam);
	abilityBuilder.assignmentWeights.allow(['read', 'update', 'delete']).when(systemAdmin);
	abilityBuilder.assignmentWeights.allow(['read', 'update', 'delete']).when(assignmentTeam);
}

/** Refuses unless the caller does the assignments of the conference. */
export async function assertCanPlanAssignment(ctx: ApiContext, conferenceId: string) {
	await assertTeamRole(ctx, conferenceId, PARTICIPANT_CARE_ROLES);
}

/** An applied delegation of a conference the caller does assignments in. */
export async function assertCanAssignDelegation(ctx: ApiContext, id: string) {
	const delegation = await db.query.delegation
		.findFirst({
			where: { id, applied: true },
			columns: { id: true, conferenceId: true, assignedRoleId: true },
			with: { members: { columns: { id: true } } }
		})
		.then(assertFindFirstExists);
	await assertTeamRole(ctx, delegation.conferenceId, PARTICIPANT_CARE_ROLES);
	return {
		...delegation,
		liveTarget: { roleId: delegation.assignedRoleId }
	};
}

/** An applied single participant of a conference the caller does assignments in. */
export async function assertCanAssignSingleParticipant(ctx: ApiContext, id: string) {
	const participant = await db.query.singleParticipant
		.findFirst({
			where: { id, applied: true },
			columns: { id: true, assignedRoleId: true },
			with: { participant: { columns: { conferenceId: true } } }
		})
		.then(assertFindFirstExists);
	const conferenceId = participant.participant.conferenceId;
	await assertTeamRole(ctx, conferenceId, PARTICIPANT_CARE_ROLES);
	return { id: participant.id, assignedRoleId: participant.assignedRoleId, conferenceId };
}

/** The conference of the application a review is about, once the caller may assign there. */
export async function assertCanReviewApplication(
	ctx: ApiContext,
	application: ReturnType<typeof reviewRow>['application']
) {
	const row =
		application.kind === 'delegation'
			? await assertCanAssignDelegation(ctx, application.id)
			: await assertCanAssignSingleParticipant(ctx, application.id);
	return row.conferenceId;
}

/** A unit of the draft, loaded through the caller's update ability. */
export async function assertCanAssignUnit(ctx: ApiContext, unitId: string) {
	return db.query.assignmentUnit
		.findFirst(
			(await ctx.abilities.assignmentUnit.filter('update')).merge({
				where: { id: unitId }
			}).query.single
		)
		.then(assertFindFirstExists);
}

/** Refuses a nation or non-state actor the conference does not offer; no role passes. */
export async function assertTargetOf(conferenceId: string, target: Target) {
	if (target.roleId) await assertOfferedIn(conferenceId, { roleId: target.roleId });
}

/** Refuses a custom role of another conference; `null` (no role) passes. */
export function assertCustomRoleOf(conferenceId: string, roleId: string | null) {
	return assertCustomRolesOf(conferenceId, roleId ? [roleId] : []);
}

/** Refuses parts of a split that name members of another delegation. */
export function assertSplitMembersOf(delegation: { members: { id: string }[] }, parts: string[][]) {
	const memberIds = new Set(delegation.members.map((member) => member.id));
	if (parts.flat().some((id) => !memberIds.has(id))) {
		throw apiError('INVALID_INPUT', m.assignmentSplitOnlyOwnMembers());
	}
}
