import { db, schema } from '$api/db/db';
import { and, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { m } from '#lib/paraglide/messages.js';
import { apiError } from '$api/services/errors/apiError';

/**
 * The entry that already logged the person in the session. Several devices may work in one
 * session, so the session itself says who was scanned.
 */
export async function scanInSession(sessionId: string, statusId: string) {
	return db.query.attendanceEntry.findFirst({
		where: { sessionId, conferenceParticipantId: statusId },
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
	const holder = await db.query.conferenceParticipant.findFirst({
		where: { conferenceId, accessCardId, id: { ne: statusId } },
		columns: { id: true }
	});
	if (holder) {
		throw apiError('CONFLICT', m.accessCardTaken());
	}
	await db
		.update(schema.conferenceParticipant)
		.set({ accessCardId })
		.where(eq(schema.conferenceParticipant.id, statusId));
}

/** Sessions of the conference with this occasion, ignoring case and surrounding spaces. */
function sameOccasion(conferenceId: string, occasion: string) {
	return and(
		eq(schema.attendanceSession.conferenceId, conferenceId),
		sql`lower(btrim(${schema.attendanceSession.occasion})) = lower(btrim(${occasion}))`
	);
}

/**
 * Whether a new session of `occasion` goes on the certificates: as the occasion's earlier sessions
 * do, so all sessions of one occasion agree; a new occasion does.
 */
export async function certificateFlagOf(conferenceId: string, occasion: string) {
	const [earlier] = await db
		.select({ show: schema.attendanceSession.showOnCertificate })
		.from(schema.attendanceSession)
		.where(sameOccasion(conferenceId, occasion))
		.limit(1);
	return earlier?.show ?? true;
}

/** Lists every session of the occasion on the certificates, or none of them. */
export async function setOccasionOnCertificate(
	conferenceId: string,
	occasion: string,
	show: boolean
) {
	await db
		.update(schema.attendanceSession)
		.set({ showOnCertificate: show })
		.where(sameOccasion(conferenceId, occasion));
}

const occasionRowSchema = z.object({
	name: z.string(),
	sessions: z.number(),
	entries: z.number(),
	firstStartedAt: z.coerce.date(),
	showOnCertificate: z.boolean()
});

/** The conference's occasions as the certificates merge them, in the order they first ran. */
export async function certificateOccasions(conferenceId: string) {
	const result = await db.execute<{ result: unknown }>(sql`
		select json_build_object(
			'name', min(btrim(s.occasion)),
			'sessions', count(distinct s.id),
			'entries', count(e.id),
			'firstStartedAt', min(s.started_at),
			'showOnCertificate', bool_and(s.show_on_certificate)
		) as result
		from attendance_session s
		left join attendance_entry e on e.session_id = s.id
		where s.conference_id = ${conferenceId} and btrim(s.occasion) <> ''
		group by lower(btrim(s.occasion))
		order by min(s.started_at)`);
	return z
		.array(z.object({ result: occasionRowSchema }))
		.parse(result.rows)
		.map((row) => row.result);
}
