import { db, schema } from '#api/db/db';
import { and, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { m } from '#lib/paraglide/messages';
import { apiError } from '#api/services/errors/apiError';

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

/**
 * Starts a session with the survey options it expects, so it never runs without them; starting
 * it again changes nothing.
 */
export async function startSession(
	values: typeof schema.attendanceSession.$inferInsert & { id: string },
	surveyOptionIds: readonly string[]
) {
	await db.transaction(async (tx) => {
		const [started] = await tx
			.insert(schema.attendanceSession)
			.values(values)
			.onConflictDoNothing()
			.returning({ id: schema.attendanceSession.id });
		const ids = [...new Set(surveyOptionIds)];
		if (!started || ids.length === 0) return;
		await tx
			.insert(schema.attendanceSessionToSurveyOption)
			.values(ids.map((optionId) => ({ a: values.id, b: optionId })));
	});
}

/**
 * Gives one session another occasion. Joining an occasion that ran before takes over its place on
 * the certificates; a new one keeps the session's.
 */
export async function renameSession(sessionId: string, conferenceId: string, occasion: string) {
	const session = await db.query.attendanceSession.findFirst({
		where: { id: sessionId },
		columns: { showOnCertificate: true }
	});
	const showOnCertificate = await certificateFlagOf(
		conferenceId,
		occasion,
		session?.showOnCertificate
	);
	await db
		.update(schema.attendanceSession)
		.set({ occasion, showOnCertificate })
		.where(eq(schema.attendanceSession.id, sessionId));
}

/**
 * Renames every session of an occasion. Renaming it to another occasion's name merges the two, and
 * the merged occasion keeps the other one's place on the certificates.
 */
export async function renameOccasion(conferenceId: string, from: string, to: string) {
	const showOnCertificate = await certificateFlagOf(
		conferenceId,
		to,
		await certificateFlagOf(conferenceId, from)
	);
	await db
		.update(schema.attendanceSession)
		.set({ occasion: to, showOnCertificate })
		.where(sameOccasion(conferenceId, from));
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
 * do, so all sessions of one occasion agree; a new occasion goes by `fallback`.
 */
export async function certificateFlagOf(conferenceId: string, occasion: string, fallback = true) {
	const [earlier] = await db
		.select({ show: schema.attendanceSession.showOnCertificate })
		.from(schema.attendanceSession)
		.where(sameOccasion(conferenceId, occasion))
		.limit(1);
	return earlier?.show ?? fallback;
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
