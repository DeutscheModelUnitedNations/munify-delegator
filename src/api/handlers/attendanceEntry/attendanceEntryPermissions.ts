import { db } from '#api/db/db';
import { type ApiContext, abilityBuilder } from '#api/rumble';
import {
	assertTeamPermission,
	isTeamMemberOfConference,
	PARTICIPANT_CARE_ROLES,
	systemAdmin,
	teamConference
} from '#api/services/authHelper/rules';
import { callerUserId } from '#api/services/authHelper/utils';
import { m } from '#lib/paraglide/messages';
import { apiError } from '#api/services/errors';

/** The abilities of attendance entries and of the sessions they are recorded in. */
export function registerAttendanceEntryAbilities() {
	// Ported from abilities/entities/attendanceEntry.ts
	abilityBuilder.attendanceEntry.allow(['read', 'update', 'delete']).when(systemAdmin);

	// Users see their own attendance entries.
	abilityBuilder.attendanceEntry.allow('read').when((ctx) => {
		const id = callerUserId(ctx);
		return id ? { where: { conferenceParticipant: { user: { id } } } } : undefined;
	});

	// Every team member of the conference may read them.
	abilityBuilder.attendanceEntry.allow('read').when((ctx) => {
		const conferenceParticipant = isTeamMemberOfConference({ ctx });
		return conferenceParticipant ? { where: { conferenceParticipant } } : undefined;
	});

	// Participant care and project management manage them.
	abilityBuilder.attendanceEntry.allow(['update', 'delete']).when((ctx) => {
		const conferenceParticipant = isTeamMemberOfConference({ ctx, roles: PARTICIPANT_CARE_ROLES });
		return conferenceParticipant ? { where: { conferenceParticipant } } : undefined;
	});

	// The sessions of a conference are the team's: every team member reads them, and starting and
	// ending one goes through the mutations, which check the team role themselves.
	abilityBuilder.attendanceSession.allow(['read', 'update', 'delete']).when(systemAdmin);
	abilityBuilder.attendanceSession.allow('read').when((ctx) => {
		const inTeamConference = isTeamMemberOfConference({ ctx });
		return inTeamConference ? { where: inTeamConference } : undefined;
	});
}

/**
 * Refuses unless the caller may start attendance sessions in the conference, expecting the survey
 * options it names, which have to be the conference's.
 */
export async function assertCanStartAttendanceSession({
	ctx,
	conferenceId,
	surveyOptionIds = []
}: {
	ctx: ApiContext;
	conferenceId: string;
	surveyOptionIds?: readonly string[];
}) {
	await assertTeamPermission({ ctx, conferenceId, permission: 'manageParticipants' });
	const ids = [...new Set(surveyOptionIds)];
	if (ids.length === 0) return;
	const options = await db.query.surveyOption.findMany({
		where: { id: { in: ids }, question: { conferenceId } },
		columns: { id: true }
	});
	if (options.length !== ids.length) {
		throw apiError({ code: 'INVALID_INPUT', message: m.sessionSurveyOptionOtherConference() });
	}
}

/**
 * Refuses unless the session exists and the caller may end or rename it; answers its conference.
 */
export async function assertCanEndAttendanceSession({
	ctx,
	sessionId
}: {
	ctx: ApiContext;
	sessionId: string;
}) {
	const session = await db.query.attendanceSession.findFirst({
		where: { id: sessionId, conference: teamConference({ ctx, permission: 'manageParticipants' }) },
		columns: { conferenceId: true }
	});
	if (!session) {
		throw apiError({ code: 'NOT_FOUND', message: m.sessionNotFound() });
	}
	return session.conferenceId;
}

/** The session, once it is known to belong to the conference the scan is recorded for. */
export async function assertSessionOfConference({
	sessionId,
	conferenceId
}: {
	sessionId: string;
	conferenceId: string;
}) {
	const session = await db.query.attendanceSession.findFirst({
		where: { id: sessionId, conferenceId },
		columns: { id: true }
	});
	if (!session) {
		throw apiError({ code: 'INVALID_INPUT', message: m.sessionNotInConference() });
	}
}

/**
 * Refuses a scan of somebody who does not take part in the conference as delegate, single
 * participant or supervisor. Recording attendance creates the person's participant row, which the
 * team has none of: a team member is shown by the scanner but never recorded.
 */
async function assertParticipantToScan({
	conferenceId,
	subjectId
}: {
	conferenceId: string;
	subjectId: string;
}) {
	const subject = await db.query.user.findFirst({
		where: { id: subjectId },
		columns: { id: true },
		with: {
			delegationMemberships: { where: { participant: { conferenceId } }, columns: { id: true } },
			singleParticipant: { where: { participant: { conferenceId } }, columns: { id: true } },
			conferenceSupervisor: { where: { participant: { conferenceId } }, columns: { id: true } },
			teamMember: { where: { conferenceId }, columns: { id: true } }
		}
	});
	const participates =
		!!subject &&
		(subject.delegationMemberships.length > 0 ||
			subject.singleParticipant.length > 0 ||
			subject.conferenceSupervisor.length > 0);
	if (participates) return;
	if (subject && subject.teamMember.length > 0) {
		throw apiError({ code: 'INVALID_INPUT', message: m.teamMembersAreNotScanned() });
	}
	throw apiError({ code: 'INVALID_INPUT', message: m.userNotInConference() });
}

/**
 * Any team member of the conference may record attendance, not just management - the scanner is
 * on every team member's dashboard - and only for somebody who takes part in the conference.
 */
async function assertMayRecordAttendance({
	ctx,
	conferenceId,
	subjectId
}: {
	ctx: ApiContext;
	conferenceId: string;
	subjectId: string;
}) {
	await assertTeamPermission({ ctx, conferenceId, permission: 'useTeamTools' });
	await assertParticipantToScan({ conferenceId, subjectId });
}

/** Who records the scan; refuses an anonymous caller and a foreign session. */
export async function assertCanCreateAttendanceEntry({
	ctx,
	args
}: {
	ctx: ApiContext;
	args: { userId: string; conferenceId: string; sessionId: string };
}) {
	const callerId = callerUserId(ctx);
	if (!callerId) {
		throw apiError({ code: 'UNAUTHENTICATED', message: m.mustBeLoggedIn() });
	}

	await assertMayRecordAttendance({ ctx, conferenceId: args.conferenceId, subjectId: args.userId });
	await assertSessionOfConference({ sessionId: args.sessionId, conferenceId: args.conferenceId });
	return callerId;
}
