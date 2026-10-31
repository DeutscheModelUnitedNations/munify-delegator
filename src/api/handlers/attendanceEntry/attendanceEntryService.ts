import { db, schema } from '#api/db/db';
import { sql } from 'drizzle-orm';
import { whereRows } from '#api/db/whereRows';
import { z } from 'zod';
import { m } from '#lib/paraglide/messages';
import { apiError } from '#api/services/errors';
import { attendanceSessionPubsub, conferenceParticipantPubsub } from '#api/pubsub';

/**
 * The entry that already logged the person in the session. Several devices may work in one
 * session, so the session itself says who was scanned.
 */
export async function scanInSession({
	sessionId,
	statusId
}: {
	sessionId: string;
	statusId: string;
}) {
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
export async function storeSessionCard({
	sessionId,
	conferenceId,
	statusId,
	accessCardId
}: {
	sessionId: string;
	conferenceId: string;
	statusId: string;
	accessCardId: string;
}) {
	const session = await db.query.attendanceSession.findFirst({
		where: { id: sessionId, conferenceId },
		columns: { mode: true }
	});
	if (session?.mode !== 'BADGE') {
		throw apiError({ code: 'INVALID_INPUT', message: m.sessionNoAccessCards() });
	}
	const holder = await db.query.conferenceParticipant.findFirst({
		where: { conferenceId, accessCardId, id: { ne: statusId } },
		columns: { id: true }
	});
	if (holder) {
		throw apiError({ code: 'CONFLICT', message: m.accessCardTaken() });
	}
	await db
		.update(schema.conferenceParticipant)
		.set({ accessCardId })
		.where(whereRows({ table: schema.conferenceParticipant, filter: { id: statusId } }));
	conferenceParticipantPubsub.updated(statusId);
}

/**
 * Starts a session with the survey options it expects, so it never runs without them; starting
 * it again changes nothing.
 */
export async function startSession({
	values,
	surveyOptionIds
}: {
	values: typeof schema.attendanceSession.$inferInsert & { id: string };
	surveyOptionIds: readonly string[];
}) {
	const started = await db.transaction(async (tx) => {
		const [started] = await tx
			.insert(schema.attendanceSession)
			.values(values)
			.onConflictDoNothing()
			.returning({ id: schema.attendanceSession.id });
		const ids = [...new Set(surveyOptionIds)];
		if (started && ids.length > 0) {
			await tx
				.insert(schema.attendanceSessionToSurveyOption)
				.values(ids.map((optionId) => ({ a: values.id, b: optionId })));
		}
		return started;
	});
	if (started) attendanceSessionPubsub.created();
}

/**
 * Gives one session another occasion. Joining an occasion that ran before takes over its place on
 * the certificates; a new one keeps the session's.
 */
export async function renameSession({
	sessionId,
	conferenceId,
	occasion
}: {
	sessionId: string;
	conferenceId: string;
	occasion: string;
}) {
	const session = await db.query.attendanceSession.findFirst({
		where: { id: sessionId },
		columns: { showOnCertificate: true }
	});
	const showOnCertificate = await certificateFlagOf({
		conferenceId,
		occasion,
		fallback: session?.showOnCertificate
	});
	await db
		.update(schema.attendanceSession)
		.set({ occasion, showOnCertificate })
		.where(whereRows({ table: schema.attendanceSession, filter: { id: sessionId } }));
	attendanceSessionPubsub.updated(sessionId);
}

/**
 * Renames every session of an occasion. Renaming it to another occasion's name merges the two, and
 * the merged occasion keeps the other one's place on the certificates.
 */
export async function renameOccasion({
	conferenceId,
	from,
	to
}: {
	conferenceId: string;
	from: string;
	to: string;
}) {
	const showOnCertificate = await certificateFlagOf({
		conferenceId,
		occasion: to,
		fallback: await certificateFlagOf({ conferenceId, occasion: from })
	});
	const renamed = await db
		.update(schema.attendanceSession)
		.set({ occasion: to, showOnCertificate })
		.where(
			whereRows({
				table: schema.attendanceSession,
				filter: sameOccasion({ conferenceId, occasion: from })
			})
		)
		.returning({ id: schema.attendanceSession.id });
	if (renamed.length > 0) attendanceSessionPubsub.updated(renamed.map((session) => session.id));
}

/** Sessions of the conference with this occasion, ignoring case and surrounding spaces. */
function sameOccasion({ conferenceId, occasion }: { conferenceId: string; occasion: string }) {
	return {
		conferenceId,
		RAW: (session: typeof schema.attendanceSession) =>
			sql`lower(btrim(${session.occasion})) = lower(btrim(${occasion}))`
	};
}

/**
 * Whether a new session of `occasion` goes on the certificates: as the occasion's earlier sessions
 * do, so all sessions of one occasion agree; a new occasion goes by `fallback`.
 */
export async function certificateFlagOf({
	conferenceId,
	occasion,
	fallback = true
}: {
	conferenceId: string;
	occasion: string;
	fallback?: boolean;
}) {
	const earlier = await db.query.attendanceSession.findFirst({
		where: sameOccasion({ conferenceId, occasion }),
		columns: { showOnCertificate: true }
	});
	return earlier?.showOnCertificate ?? fallback;
}

/** Lists every session of the occasion on the certificates, or none of them. */
export async function setOccasionOnCertificate({
	conferenceId,
	occasion,
	show
}: {
	conferenceId: string;
	occasion: string;
	show: boolean;
}) {
	const changed = await db
		.update(schema.attendanceSession)
		.set({ showOnCertificate: show })
		.where(
			whereRows({
				table: schema.attendanceSession,
				filter: sameOccasion({ conferenceId, occasion })
			})
		)
		.returning({ id: schema.attendanceSession.id });
	if (changed.length > 0) attendanceSessionPubsub.updated(changed.map((session) => session.id));
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
