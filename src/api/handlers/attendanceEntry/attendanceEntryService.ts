import { db, schema } from '$api/db/db';
import { assertFirstEntryExists } from '@m1212e/rumble';
import { eq } from 'drizzle-orm';
import { m } from '$lib/paraglide/messages';
import { apiError } from '$api/services/errors/apiError';

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
