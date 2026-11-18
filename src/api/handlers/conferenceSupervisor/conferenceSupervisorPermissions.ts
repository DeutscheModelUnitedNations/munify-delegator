import { db } from '#api/db/db';
import { abilityBuilder, type ApiContext } from '#api/rumble';
import {
	assertTeamPermission,
	caredForVia,
	idIn,
	linkedChase,
	RELEASED_MIRRORED_CONFERENCE,
	systemAdmin,
	teamConference
} from '#api/services/authHelper/rules';
import { callerUserId } from '#api/services/authHelper/utils';
import { liveRule, liveWhere } from '#api/services/authHelper/callerFacts';
import {
	fetchParticipationsAndTeamMembership,
	isParticipantOrTeamMember
} from '#api/services/registration/participation';
import { m } from '#lib/paraglide/messages';
import { apiError } from '#api/services/errors';

/**
 * Masks the connection code: whoever holds it can attach themselves to the supervisor, so only the
 * supervisor and participant care read it.
 */
const WITHOUT_CONNECTION_CODE = { connectionCode: false };

export function registerConferenceSupervisorAbilities() {
	// The linked CHASE mirrors it (`docs/plans/chase-link.md`): only these columns, and people only
	// once the assignment is released.
	abilityBuilder.conferenceSupervisor.allow('read').when(
		linkedChase({
			where: { conference: RELEASED_MIRRORED_CONFERENCE },
			columns: { id: true, conferenceParticipantId: true }
		})
	);

	// System admins read, update and delete every supervisor.
	abilityBuilder.conferenceSupervisor.allow(['read', 'update', 'delete']).when(systemAdmin);

	// Participant care (project management and participant care) reads, updates and deletes the
	// supervisors of its conference (through the supervisor's part in it, which holds the conference).
	abilityBuilder.conferenceSupervisor
		.allow(['read', 'update', 'delete'])
		.when(liveWhere((args) => caredForVia(args, 'participant')));

	// Delegates and single participants read their own supervisors, without the connection code.
	abilityBuilder.conferenceSupervisor.allow('read').when(
		liveRule(({ ctx, facts }) =>
			callerUserId(ctx)
				? {
						where: { id: idIn(facts.ownSupervisors.map((supervisor) => supervisor.supervisorId)) },
						columns: WITHOUT_CONNECTION_CODE
					}
				: undefined
		)
	);

	// Everyone reads, updates and deletes their own supervisor row.
	abilityBuilder.conferenceSupervisor
		.allow(['read', 'update', 'delete'])
		.when(
			liveWhere(({ ctx, facts }) =>
				callerUserId(ctx)
					? { id: idIn(facts.supervisorRegistrations.map((supervisor) => supervisor.id)) }
					: undefined
			)
		);

	// Supervisors read the co-supervisors of their students, without the connection code: the group
	// payment page splits a fee between them.
	abilityBuilder.conferenceSupervisor.allow('read').when(
		liveRule(({ ctx, facts }) =>
			callerUserId(ctx)
				? {
						where: { id: idIn(facts.coSupervisors.map((supervisor) => supervisor.supervisorId)) },
						columns: WITHOUT_CONNECTION_CODE
					}
				: undefined
		)
	);
}

/**
 * Refuses registering somebody else (`subjectUserId`) as supervisor unless the caller holds
 * `manageParticipants` (project management and participant care) in the conference; registering
 * oneself always passes here (the registration window is the service's). Returns who is
 * registered, and whether it is the caller themselves (`selfService`).
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
	if (!subjectUserId || subjectUserId === callerId) {
		return { subjectId: callerId, selfService: true };
	}
	await assertTeamPermission({ ctx, conferenceId, permission: 'manageParticipants' });
	return { subjectId: subjectUserId, selfService: false };
}

/**
 * Refuses connecting somebody else (`subjectUserId`) to a supervisor unless the caller holds
 * `manageParticipants` (project management and participant care; the user card's supervisor
 * modal); connecting oneself passes, the connection code being the check there. Returns who is
 * connected.
 */
export async function assertCanConnectToConferenceSupervisor({
	ctx,
	conferenceId,
	subjectUserId
}: {
	ctx: ApiContext;
	conferenceId: string;
	subjectUserId: string | null | undefined;
}) {
	const callerId = ctx.mustBeLoggedIn().sub;
	if (!subjectUserId || subjectUserId === callerId) return { subjectId: callerId };
	await assertTeamPermission({ ctx, conferenceId, permission: 'manageParticipants' });
	return { subjectId: subjectUserId };
}

/**
 * Refuses ending a supervision unless the caller is the supervised person, the supervisor, or holds
 * `manageParticipants` (project management and participant care) in the supervisor's conference;
 * an unknown supervisor is NOT_FOUND. Returns that conference's id, which the service needs to
 * find the person's participant row.
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
 * participants can (FORBIDDEN otherwise), never supervisors or the team (CONFLICT). About the
 * subject, not the caller. Returns the subject's participations, which get the supervision link.
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
 * Refuses (FORBIDDEN) unless the caller's update ability reaches the supervisor: the supervisor
 * themselves, or `manageParticipants` (project management and participant care) in its
 * conference. Returns the supervisor's id.
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
 * Refuses (FORBIDDEN) unless the caller already has a part in the conference (delegate, single
 * participant, supervisor or team), so an arbitrary signed-in user cannot probe connection codes.
 * Returns the caller's id, whose school the preview compares with the supervisor's.
 */
export async function assertCanPreviewConferenceSupervisor({
	ctx,
	conferenceId
}: {
	ctx: ApiContext;
	conferenceId: string;
}) {
	const callerId = ctx.mustBeLoggedIn().sub;
	if (!(await isParticipantOrTeamMember({ conferenceId, userId: callerId }))) {
		throw apiError({ code: 'FORBIDDEN', message: m.notRegisteredForConference() });
	}
	return { callerId };
}

/**
 * Refuses (NOT_FOUND) unless the delegation member is in a conference where the caller holds
 * `manageParticipants` (project management and participant care), who turn a delegate into a
 * supervisor of their delegation.
 */
export async function assertCanMakeDelegationMemberSupervisor({
	ctx,
	delegationMemberId
}: {
	ctx: ApiContext;
	delegationMemberId: string;
}) {
	const member = await db.query.delegationMember.findFirst({
		where: {
			id: delegationMemberId,
			conference: await teamConference({ ctx, permission: 'manageParticipants' })
		},
		columns: { id: true }
	});
	if (!member) {
		throw apiError({ code: 'NOT_FOUND', message: m.updateNotFoundOrForbidden() });
	}
}
