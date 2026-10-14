import { db, schema } from '$api/db/db';
import { assertTeamRole, participatesIn, userId } from '$api/services/authHelper';
import { assertFirstEntryExists } from '@m1212e/rumble';
import { eq } from 'drizzle-orm';
import type { Context } from '$api/context';
import { m } from '$lib/paraglide/messages';
import { apiError } from '$api/services/apiError';

/**
 * Any team member of the conference may record attendance, not just management - the scanner is
 * on every team member's dashboard - and only for somebody who is part of the conference.
 */
async function assertMayRecordAttendance(ctx: Context, conferenceId: string, subjectId: string) {
	await assertTeamRole(ctx, conferenceId);
	const subject = await db.query.user.findFirst({
		where: {
			id: subjectId,
			OR: [...participatesIn({ id: conferenceId }).OR, { teamMember: { conferenceId } }]
		},
		columns: { id: true }
	});
	if (!subject) {
		throw apiError('INVALID_INPUT', m.userNotInConference());
	}
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

/** Who records the scan; refuses an anonymous caller and a foreign session. */
export async function assertMayCreateEntry(
	ctx: Context,
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

/**
 * The participant status row is created on demand, as the legacy upsert did. The no-op `set` is
 * how Postgres returns the existing row on conflict.
 */
export async function ensureParticipantStatus(userId: string, conferenceId: string) {
	return db
		.insert(schema.conferenceParticipantStatus)
		.values({ userId, conferenceId })
		.onConflictDoUpdate({
			target: [
				schema.conferenceParticipantStatus.userId,
				schema.conferenceParticipantStatus.conferenceId
			],
			set: { userId }
		})
		.returning()
		.then(assertFirstEntryExists);
}

/**
 * The entry that already logged the person in the session. Several devices may work in one
 * session, so the session itself says who was scanned.
 */
export async function scanInSession(sessionId: string, statusId: string) {
	return db.query.attendanceEntry.findFirst({
		where: { sessionId, conferenceParticipantStatusId: statusId },
		columns: { id: true }
	});
}

/**
 * Stores an access card on the person's status. Any team member working in a session that hands
 * out cards may do this, which is what the session was set up for by participant care; outside such
 * a session cards are written through the status update, for participant care only.
 */
export async function storeSessionCard(
	sessionId: string,
	conferenceId: string,
	statusId: string,
	accessCardId: string
) {
	const session = await db.query.attendanceSession.findFirst({
		where: { id: sessionId, conferenceId },
		columns: { mode: true }
	});
	if (session?.mode !== 'BADGE') {
		throw apiError('INVALID_INPUT', m.sessionNoAccessCards());
	}
	const holder = await db.query.conferenceParticipantStatus.findFirst({
		where: { conferenceId, accessCardId, id: { ne: statusId } },
		columns: { id: true }
	});
	if (holder) {
		throw apiError('CONFLICT', m.accessCardTaken());
	}
	await db
		.update(schema.conferenceParticipantStatus)
		.set({ accessCardId })
		.where(eq(schema.conferenceParticipantStatus.id, statusId));
}
