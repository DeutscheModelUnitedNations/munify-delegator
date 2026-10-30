import { db } from '#api/db/db';
import { abilityBuilder, type ApiContext } from '#api/rumble';
import {
	PARTICIPANT_CARE_ROLES,
	assertTeamPermission,
	isOwnUser,
	isTeamMemberOfConference,
	systemAdmin
} from '#api/services/authHelper/rules';
import { callerUserId, grantWhere } from '#api/services/authHelper/utils';
import { fetchParticipationsAndTeamMembership } from '#api/services/registration/participation';
import { m } from '#lib/paraglide/messages';
import { apiError } from '#api/services/errors/apiError';

/**
 * Whoever holds a supervisor's connection code can attach themselves to that supervisor, so it is
 * the supervisor's to hand out: only they and participant care read it.
 */
const WITHOUT_CONNECTION_CODE = { connectionCode: false };

export function registerConferenceSupervisorAbilities() {
	// Ported from abilities/entities/conferenceSupervisor.ts
	abilityBuilder.conferenceSupervisor.allow(['read', 'update', 'delete']).when(systemAdmin);

	// Participant care and project management manage their conference's supervisors.
	abilityBuilder.conferenceSupervisor
		.allow(['read', 'update', 'delete'])
		.when((ctx) => grantWhere(isTeamMemberOfConference(ctx, PARTICIPANT_CARE_ROLES)));

	// Supervised participants see their own supervisors.
	abilityBuilder.conferenceSupervisor.allow('read').when((ctx) => {
		const id = callerUserId(ctx);
		return id
			? {
					where: {
						OR: [
							{ supervisedDelegationMembers: { user: { id } } },
							{ supervisedSingleParticipants: { user: { id } } }
						]
					},
					columns: WITHOUT_CONNECTION_CODE
				}
			: undefined;
	});

	// Supervisors manage their own entry.
	abilityBuilder.conferenceSupervisor
		.allow(['read', 'update', 'delete'])
		.when((ctx) => grantWhere(isOwnUser(ctx)));

	// Supervisors see the other supervisors of the participants they share - the group payment page
	// splits a fee between them.
	abilityBuilder.conferenceSupervisor.allow('read').when((ctx) => {
		const id = callerUserId(ctx);
		if (!id) return undefined;
		const supervisedByMe = { supervisors: { user: { id } } };
		return {
			where: {
				OR: [
					{ supervisedDelegationMembers: supervisedByMe },
					{ supervisedSingleParticipants: supervisedByMe }
				]
			},
			columns: WITHOUT_CONNECTION_CODE
		};
	});
}

/**
 * Assigning somebody else as supervisor needs participant care, project management or admin.
 * Registering yourself does not - which is why the check is gated on `subjectUserId` being
 * present.
 */
export async function assertCanCreateConferenceSupervisor(
	ctx: ApiContext,
	conferenceId: string,
	subjectUserId: string | null | undefined
) {
	const callerId = ctx.mustBeLoggedIn().sub;
	if (subjectUserId && subjectUserId !== callerId) {
		await assertTeamPermission(ctx, conferenceId, 'manageParticipants');
	}
}

/**
 * Connecting somebody else to a supervisor is participant care's job (the user card's supervisor
 * modal); the code alone only lets a participant attach themselves.
 */
export async function assertCanConnectToConferenceSupervisor(
	ctx: ApiContext,
	conferenceId: string,
	subjectId: string
) {
	if (subjectId !== ctx.mustBeLoggedIn().sub) {
		await assertTeamPermission(ctx, conferenceId, 'manageParticipants');
	}
}

/**
 * Ending a supervision: the supervised person themselves, the supervisor themselves, or participant
 * care of the supervisor's conference. Returns the conference, which the service needs to find the
 * person's participant row.
 */
export async function assertCanDisconnectFromConferenceSupervisor(
	ctx: ApiContext,
	supervisorId: string,
	subjectId: string
) {
	const supervisor = await db.query.conferenceSupervisor.findFirst({
		where: { id: supervisorId },
		columns: { id: true },
		with: { participant: { columns: { conferenceId: true, userId: true } } }
	});
	if (!supervisor) throw apiError('NOT_FOUND', m.supervisorNotFound());
	const { conferenceId, userId: supervisorUserId } = supervisor.participant;
	const caller = ctx.mustBeLoggedIn().sub;
	if (caller !== subjectId && caller !== supervisorUserId) {
		await assertTeamPermission(ctx, conferenceId, 'manageParticipants');
	}
	return conferenceId;
}

/**
 * Refuses a subject who cannot be supervised in the conference: supervisors and team members
 * cannot, and somebody who does not take part as delegate or single participant has nothing to be
 * supervised in. Returns the subject's participations, which get the supervision link.
 */
export async function assertCanBeSupervised(conferenceId: string, subjectId: string) {
	const participation = await fetchParticipationsAndTeamMembership({
		conferenceId,
		userId: subjectId
	});

	if (participation.foundSupervisor || participation.foundTeamMember) {
		throw apiError('CONFLICT', m.supervisorAlreadySupervisorOrTeam());
	}
	if (!participation.foundDelegationMember && !participation.foundSingleParticipant) {
		throw apiError('FORBIDDEN', m.supervisorNotParticipant());
	}
	return participation;
}

/**
 * The supervisor themselves, participant care and project management, and admins: the row's
 * update ability. Returns the supervisor.
 */
export async function assertCanRotateSupervisorConnectionCode(ctx: ApiContext, id: string) {
	const supervisor = await db.query.conferenceSupervisor.findFirst({
		...(await ctx.abilities.conferenceSupervisor.filter('update')).merge({ where: { id } }).query
			.single,
		columns: { id: true }
	});
	if (!supervisor) {
		throw apiError('FORBIDDEN', m.supervisorRotateForbidden());
	}
	return supervisor;
}

/**
 * Previewing a supervisor by connection code requires the caller to already take part in the
 * conference in some role, so an arbitrary logged-in user cannot probe codes.
 */
export async function assertCanPreviewConferenceSupervisor(ctx: ApiContext, conferenceId: string) {
	const participation = await fetchParticipationsAndTeamMembership({
		conferenceId,
		userId: ctx.mustBeLoggedIn().sub
	});

	if (
		!participation.foundDelegationMember &&
		!participation.foundSingleParticipant &&
		!participation.foundTeamMember &&
		!participation.foundSupervisor
	) {
		throw apiError('FORBIDDEN', m.notRegisteredForConference());
	}
}
