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
	abilityBuilder.attendanceEntry.allow(['read', 'update', 'delete']).when(systemAdmin);

	// Everyone reads their own attendance entries.
	abilityBuilder.attendanceEntry.allow('read').when((ctx) => {
		const id = callerUserId(ctx);
		return id ? { where: { conferenceParticipant: { user: { id } } } } : undefined;
	});

	// Every team member reads those of their conference.
	abilityBuilder.attendanceEntry.allow('read').when((ctx) => {
		const conferenceParticipant = isTeamMemberOfConference({ ctx });
		return conferenceParticipant ? { where: { conferenceParticipant } } : undefined;
	});

	// Participant care (project management and participant care) updates and deletes them.
	abilityBuilder.attendanceEntry.allow(['update', 'delete']).when((ctx) => {
		const conferenceParticipant = isTeamMemberOfConference({ ctx, roles: PARTICIPANT_CARE_ROLES });
		return conferenceParticipant ? { where: { conferenceParticipant } } : undefined;
	});

	// Every team member reads their conference's sessions. Nobody but a system admin updates or
	// deletes them through the ability: starting, renaming and ending go through
	// `assertCanStartAttendanceSession` / `assertCanManageAttendanceSession`.
	abilityBuilder.attendanceSession.allow(['read', 'update', 'delete']).when(systemAdmin);
	abilityBuilder.attendanceSession.allow('read').when((ctx) => {
		const inTeamConference = isTeamMemberOfConference({ ctx });
		return inTeamConference ? { where: inTeamConference } : undefined;
	});
}

/**
 * Refuses unless the caller holds `manageParticipants` (project management and participant care) in
 * the conference, and every survey option the session expects is one of the conference's.
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
 * Refuses unless the session exists in a conference where the caller holds `manageParticipants`
 * (project management and participant care), who end and rename sessions. Returns its conference id.
 */
export async function assertCanManageAttendanceSession({
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
	return { conferenceId: session.conferenceId };
}

/** Refuses (INVALID_INPUT) unless the session belongs to the conference, e.g. the one a scan is recorded for. */
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
 * Refuses (INVALID_INPUT) unless the scanned user is registered in the conference as delegate,
 * single participant or supervisor. A team member is shown by the scanner but never recorded: they
 * have no participant row to record attendance on.
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
 * Refuses unless the caller is on the conference's team (any role: the scanner is on every team
 * member's dashboard), the scanned user takes part in it (`assertParticipantToScan`) and the
 * session belongs to it. Returns the caller's user id, who is recorded as the scanner.
 */
export async function assertCanCreateAttendanceEntry({
	ctx,
	args
}: {
	ctx: ApiContext;
	args: { userId: string; conferenceId: string; sessionId: string };
}) {
	await assertTeamPermission({ ctx, conferenceId: args.conferenceId, permission: 'useTeamTools' });
	await assertParticipantToScan({ conferenceId: args.conferenceId, subjectId: args.userId });
	await assertSessionOfConference({ sessionId: args.sessionId, conferenceId: args.conferenceId });
	return { callerId: ctx.mustBeLoggedIn().sub };
}
