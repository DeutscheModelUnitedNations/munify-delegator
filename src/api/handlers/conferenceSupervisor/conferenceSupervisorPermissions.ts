import { db } from '#api/db/db.js';
import { abilityBuilder, type ApiContext } from '#api/rumble.js';
import {
	PARTICIPANT_CARE_ROLES,
	assertTeamRole,
	isOwnUser,
	isTeamMemberOfConference,
	systemAdmin,
	userId,
	where
} from '#api/services/authHelper.js';
import { fetchUserParticipations } from '#api/services/registration/participation.js';
import { m } from '#lib/paraglide/messages.js';
import { apiError } from '#api/services/errors/apiError.js';

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
		.when((ctx) => where(isTeamMemberOfConference(ctx, PARTICIPANT_CARE_ROLES)));

	// Supervised participants see their own supervisors.
	abilityBuilder.conferenceSupervisor.allow('read').when((ctx) => {
		const id = userId(ctx);
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
		.when((ctx) => where(isOwnUser(ctx)));

	// Supervisors see the other supervisors of the participants they share - the group payment page
	// splits a fee between them.
	abilityBuilder.conferenceSupervisor.allow('read').when((ctx) => {
		const id = userId(ctx);
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
		await assertTeamRole(ctx, conferenceId, PARTICIPANT_CARE_ROLES);
	}
}

/**
 * The supervisor row if the caller may update it (the row's update ability), as a where-clause:
 * an update the caller may not make changes nothing, and the mutation answers with the row as it
 * is.
 */
export async function updatableConferenceSupervisor(ctx: ApiContext, id: string) {
	return (await ctx.abilities.conferenceSupervisor.filter('update')).merge({ where: { id } }).sql
		.where;
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
		await assertTeamRole(ctx, conferenceId, PARTICIPANT_CARE_ROLES);
	}
}

/**
 * Refuses a subject who cannot be supervised in the conference: supervisors and team members
 * cannot, and somebody who does not take part as delegate or single participant has nothing to be
 * supervised in. Returns the subject's participations, which get the supervision link.
 */
export async function assertCanBeSupervised(conferenceId: string, subjectId: string) {
	const participation = await fetchUserParticipations({ conferenceId, userId: subjectId });

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
	const participation = await fetchUserParticipations({
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
