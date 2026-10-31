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
import { apiError } from '#api/services/errors';

/**
 * Masks the connection code: whoever holds it can attach themselves to the supervisor, so only the
 * supervisor and participant care read it.
 */
const WITHOUT_CONNECTION_CODE = { connectionCode: false };

export function registerConferenceSupervisorAbilities() {
	// System admins read, update and delete every supervisor.
	abilityBuilder.conferenceSupervisor.allow(['read', 'update', 'delete']).when(systemAdmin);

	// Participant care (project management and participant care) reads, updates and deletes the
	// supervisors of its conference.
	abilityBuilder.conferenceSupervisor
		.allow(['read', 'update', 'delete'])
		.when((ctx) => grantWhere(isTeamMemberOfConference({ ctx, roles: PARTICIPANT_CARE_ROLES })));

	// Delegates and single participants read their own supervisors, without the connection code.
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

	// Supervisors read, update and delete their own supervisor row.
	abilityBuilder.conferenceSupervisor
		.allow(['read', 'update', 'delete'])
		.when((ctx) => grantWhere(isOwnUser(ctx)));

	// Supervisors read the co-supervisors of their students, without the connection code: the group
	// payment page splits a fee between them.
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
 * Refuses registering somebody else (`subjectUserId`) as supervisor unless the caller holds
 * `manageParticipants` in the conference; registering oneself always passes.
 */
export async function assertCanCreateConferenceSupervisor({
	ctx,
	conferenceId,
	subjectUserId
}: {
	ctx: ApiContext;
	conferenceId: string;
	subjectUserId: string | null | undefined;
}) {
	const callerId = ctx.mustBeLoggedIn().sub;
	if (subjectUserId && subjectUserId !== callerId) {
		await assertTeamPermission({ ctx, conferenceId, permission: 'manageParticipants' });
	}
}

/**
 * Refuses connecting somebody else (`subjectId`) to a supervisor unless the caller holds
 * `manageParticipants` (the user card's supervisor modal); connecting oneself passes, the
 * connection code being the check there.
 */
export async function assertCanConnectToConferenceSupervisor({
	ctx,
	conferenceId,
	subjectId
}: {
	ctx: ApiContext;
	conferenceId: string;
	subjectId: string;
}) {
	if (subjectId !== ctx.mustBeLoggedIn().sub) {
		await assertTeamPermission({ ctx, conferenceId, permission: 'manageParticipants' });
	}
}

/**
 * Refuses ending a supervision unless the caller is the supervised person, the supervisor, or holds
 * `manageParticipants` in the supervisor's conference. Returns that conference's id, which the
 * service needs to find the person's participant row.
 */
export async function assertCanDisconnectFromConferenceSupervisor({
	ctx,
	supervisorId,
	subjectId
}: {
	ctx: ApiContext;
	supervisorId: string;
	subjectId: string;
}) {
	const supervisor = await db.query.conferenceSupervisor.findFirst({
		where: { id: supervisorId },
		columns: { id: true },
		with: { participant: { columns: { conferenceId: true, userId: true } } }
	});
	if (!supervisor) throw apiError({ code: 'NOT_FOUND', message: m.supervisorNotFound() });
	const { conferenceId, userId: supervisorUserId } = supervisor.participant;
	const caller = ctx.mustBeLoggedIn().sub;
	if (caller !== subjectId && caller !== supervisorUserId) {
		await assertTeamPermission({ ctx, conferenceId, permission: 'manageParticipants' });
	}
	return { conferenceId };
}

/**
 * Refuses a subject who cannot be supervised in the conference: only delegates and single
 * participants can, never supervisors or the team. About the subject, not the caller. Returns the
 * subject's participations, which get the supervision link.
 */
export async function assertCanBeSupervised({
	conferenceId,
	subjectId
}: {
	conferenceId: string;
	subjectId: string;
}) {
	const participation = await fetchParticipationsAndTeamMembership({
		conferenceId,
		userId: subjectId
	});

	if (participation.foundSupervisor || participation.foundTeamMember) {
		throw apiError({ code: 'CONFLICT', message: m.supervisorAlreadySupervisorOrTeam() });
	}
	if (!participation.foundDelegationMember && !participation.foundSingleParticipant) {
		throw apiError({ code: 'FORBIDDEN', message: m.supervisorNotParticipant() });
	}
	return participation;
}

/**
 * Refuses unless the caller may update the supervisor (the row's update ability: the supervisor,
 * participant care, system admins). Returns the supervisor's id.
 */
export async function assertCanRotateSupervisorConnectionCode({
	ctx,
	id
}: {
	ctx: ApiContext;
	id: string;
}) {
	const supervisor = await db.query.conferenceSupervisor.findFirst({
		...(await ctx.abilities.conferenceSupervisor.filter('update')).merge({ where: { id } }).query
			.single,
		columns: { id: true }
	});
	if (!supervisor) {
		throw apiError({ code: 'FORBIDDEN', message: m.supervisorRotateForbidden() });
	}
	return supervisor;
}

/**
 * Refuses unless the caller already has a part in the conference (delegate, single participant,
 * supervisor or team), so an arbitrary signed-in user cannot probe connection codes.
 */
export async function assertCanPreviewConferenceSupervisor({
	ctx,
	conferenceId
}: {
	ctx: ApiContext;
	conferenceId: string;
}) {
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
		throw apiError({ code: 'FORBIDDEN', message: m.notRegisteredForConference() });
	}
}
