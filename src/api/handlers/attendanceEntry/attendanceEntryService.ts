import { db, schema } from '#api/db/db';
import { sql } from 'drizzle-orm';
import { whereRows } from '#api/db/whereRows';
import { m } from '#lib/paraglide/messages';
import { apiError, isUniqueViolationOn } from '#api/services/errors';
import { assertFirstEntryExists } from '@m1212e/rumble';
import {
	attendanceEntryPubsub,
	attendanceSessionPubsub,
	conferenceParticipantPubsub
} from '#api/pubsub';
import { ensureConferenceParticipant } from '#api/handlers/conferenceParticipant/conferenceParticipantService';
import { checkPassedForScan } from '#api/handlers/scanLookup/scanLookupService';

/**
 * The entry that already logged the person in the session. Several devices may work in one
 * session, so the session itself says who was scanned.
 */
async function scanInSession({ sessionId, statusId }: { sessionId: string; statusId: string }) {
	return db.query.attendanceEntry.findFirst({
		where: { sessionId, conferenceParticipantId: statusId },
		columns: { id: true }
	});
}

const sessionNameTaken = () => apiError({ code: 'CONFLICT', message: m.sessionNameTaken() });

/** Turns the unique index refusing a name another session of the conference has (ignoring case) into its error. */
async function refusingTakenName<T>(write: Promise<T>) {
	try {
		return await write;
	} catch (error) {
		if (isUniqueViolationOn({ error, column: 'occasion' })) throw sessionNameTaken();
		throw error;
	}
}

/**
 * Starts a session with the survey options it expects, so it never runs without them; starting
 * it again changes nothing. A name another session has is refused: that one is joined instead.
 */
export async function startSession({
	values,
	surveyOptionIds
}: {
	values: typeof schema.attendanceSession.$inferInsert & { id: string };
	surveyOptionIds: readonly string[];
}) {
	const started = await refusingTakenName(
		db.transaction(async (tx) => {
			const [started] = await tx
				.insert(schema.attendanceSession)
				.values(values)
				.onConflictDoNothing({ target: schema.attendanceSession.id })
				.returning({ id: schema.attendanceSession.id });
			const ids = [...new Set(surveyOptionIds)];
			if (started && ids.length > 0) {
				await tx
					.insert(schema.attendanceSessionToSurveyOption)
					.values(ids.map((optionId) => ({ a: values.id, b: optionId })));
			}
			return started;
		})
	);
	if (started) attendanceSessionPubsub.created();
}

/**
 * Changes a session; an absent field is left as it is. A name another session of the conference
 * has is refused. Ending keeps the time it first ended; reopening keeps its scans, so nobody is
 * scanned twice.
 */
export async function updateAttendanceSession({
	id,
	occasion,
	showOnCertificate,
	ended
}: {
	id: string;
	occasion?: string;
	showOnCertificate?: boolean;
	ended?: boolean;
}) {
	const endedAt = schema.attendanceSession.endedAt;
	await refusingTakenName(
		db
			.update(schema.attendanceSession)
			.set({
				occasion,
				showOnCertificate,
				endedAt: ended === undefined ? undefined : ended ? sql`coalesce(${endedAt}, now())` : null
			})
			.where(whereRows({ table: schema.attendanceSession, filter: { id } }))
	);
	attendanceSessionPubsub.updated(id);
}

/**
 * Records the scan of a person in a session of their conference, creating their participant row
 * when they have none yet. Refuses (ALREADY_SCANNED) a second scan in the session. Whether the
 * check passed is decided here, as things stand when the scan is written. Returns the entry's id.
 */
export async function recordScan({
	conferenceId,
	sessionId,
	userId,
	recordedById
}: {
	conferenceId: string;
	sessionId: string;
	userId: string;
	recordedById: string;
}) {
	const participantId = await ensureConferenceParticipant({ tx: db, conferenceId, userId });

	if (await scanInSession({ sessionId, statusId: participantId })) {
		throw apiError({ code: 'ALREADY_SCANNED', message: m.alreadyScannedInSession() });
	}

	const checkPassed = await checkPassedForScan({ conferenceId, sessionId, userId });
	const created = await db
		.insert(schema.attendanceEntry)
		.values({ conferenceParticipantId: participantId, recordedById, sessionId, checkPassed })
		.returning({ id: schema.attendanceEntry.id })
		.then(assertFirstEntryExists);

	attendanceEntryPubsub.created();
	conferenceParticipantPubsub.updated(participantId);
	// The session's entry count changed, which its readers show
	attendanceSessionPubsub.updated(sessionId);
	return created.id;
}
