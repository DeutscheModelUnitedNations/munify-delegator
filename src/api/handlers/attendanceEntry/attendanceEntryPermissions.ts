import { db } from '$api/db/db';
import { type ApiContext, abilityBuilder } from '$api/rumble';
import {
	PARTICIPANT_CARE_ROLES,
	assertTeamRole,
	assertUserInConference,
	isTeamMemberOfConference,
	systemAdmin,
	userId
} from '$api/services/authHelper';
import { m } from '$lib/paraglide/messages';
import { apiError } from '$api/services/errors/apiError';

/** The abilities of attendance entries and of the sessions they are recorded in. */
export function registerAttendanceEntryAbilities() {
	// Ported from abilities/entities/attendanceEntry.ts
	abilityBuilder.attendanceEntry.allow(['read', 'update', 'delete']).when(systemAdmin);

	// Users see their own attendance entries.
	abilityBuilder.attendanceEntry.allow('read').when((ctx) => {
		const id = userId(ctx);
		return id ? { where: { conferenceParticipantStatus: { user: { id } } } } : undefined;
	});

	// Every team member of the conference may read them.
	abilityBuilder.attendanceEntry.allow('read').when((ctx) => {
		const conferenceParticipantStatus = isTeamMemberOfConference(ctx);
		return conferenceParticipantStatus ? { where: { conferenceParticipantStatus } } : undefined;
	});

	// Participant care and project management manage them.
	abilityBuilder.attendanceEntry.allow(['update', 'delete']).when((ctx) => {
		const conferenceParticipantStatus = isTeamMemberOfConference(ctx, PARTICIPANT_CARE_ROLES);
		return conferenceParticipantStatus ? { where: { conferenceParticipantStatus } } : undefined;
	});

	// The sessions of a conference are the team's: every team member reads them, and starting and
	// ending one goes through the mutations, which check the team role themselves.
	abilityBuilder.attendanceSession.allow(['read', 'update', 'delete']).when(systemAdmin);
	abilityBuilder.attendanceSession.allow('read').when((ctx) => {
		const inTeamConference = isTeamMemberOfConference(ctx);
		return inTeamConference ? { where: inTeamConference } : undefined;
	});
}

/** Refuses unless the caller may start attendance sessions in the conference. */
export async function assertCanStartAttendanceSession(ctx: ApiContext, conferenceId: string) {
	await assertTeamRole(ctx, conferenceId, PARTICIPANT_CARE_ROLES);
}

/** Refuses unless the session exists and the caller may end it. */
export async function assertCanEndAttendanceSession(ctx: ApiContext, sessionId: string) {
	const session = await db.query.attendanceSession.findFirst({
		where: { id: sessionId },
		columns: { conferenceId: true }
	});
	if (!session) {
		throw apiError('NOT_FOUND', m.sessionNotFound());
	}
	await assertTeamRole(ctx, session.conferenceId, PARTICIPANT_CARE_ROLES);
}

/** The session, once it is known to belong to the conference the scan is recorded for. */
export async function assertSessionOfConference(sessionId: string, conferenceId: string) {
	const session = await db.query.attendanceSession.findFirst({
		where: { id: sessionId, conferenceId },
		columns: { id: true }
	});
	if (!session) {
		throw apiError('INVALID_INPUT', m.sessionNotInConference());
	}
}

/**
 * Any team member of the conference may record attendance, not just management - the scanner is
 * on every team member's dashboard - and only for somebody who is part of the conference.
 */
async function assertMayRecordAttendance(ctx: ApiContext, conferenceId: string, subjectId: string) {
	await assertTeamRole(ctx, conferenceId);
	await assertUserInConference(conferenceId, subjectId);
}

/** Who records the scan; refuses an anonymous caller and a foreign session. */
export async function assertCanCreateAttendanceEntry(
	ctx: ApiContext,
	args: { userId: string; conferenceId: string; sessionId: string }
) {
	const callerId = userId(ctx);
	if (!callerId) {
		throw apiError('UNAUTHENTICATED', m.mustBeLoggedIn());
	}

	await assertMayRecordAttendance(ctx, args.conferenceId, args.userId);
	await assertSessionOfConference(args.sessionId, args.conferenceId);
	return callerId;
}

/** The entry `id`, if the caller may delete it: a where clause matching nothing otherwise. */
export async function deletableAttendanceEntryWhere(ctx: ApiContext, id: string) {
	return (await ctx.abilities.attendanceEntry.filter('delete')).merge({ where: { id } }).sql.where;
}
