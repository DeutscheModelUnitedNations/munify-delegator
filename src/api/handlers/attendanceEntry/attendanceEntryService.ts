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

/** The session of the conference with this name, ignoring case; names are unique there. */
function sameName({ conferenceId, occasion }: { conferenceId: string; occasion: string }) {
	return {
		conferenceId,
		RAW: (session: typeof schema.attendanceSession) =>
			sql`lower(${session.occasion}) = lower(${occasion})`
	};
}

/** Refuses (CONFLICT) a name another session of the conference already has. */
async function assertNameFree({
	conferenceId,
	occasion,
	sessionId
}: {
	conferenceId: string;
	occasion: string;
	sessionId: string;
}) {
	const holder = await db.query.attendanceSession.findFirst({
		where: { ...sameName({ conferenceId, occasion }), id: { ne: sessionId } },
		columns: { id: true }
	});
	if (holder) throw sessionNameTaken();
}

const sessionNameTaken = () => apiError({ code: 'CONFLICT', message: m.sessionNameTaken() });

/** Turns the unique index refusing a taken name, in a race the check above lost, into its error. */
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
	await assertNameFree({
		conferenceId: values.conferenceId,
		occasion: values.occasion,
		sessionId: values.id
	});
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

/** Gives a session another name; one another session of the conference has is refused. */
export async function renameSession({
	sessionId,
	conferenceId,
	occasion
}: {
	sessionId: string;
	conferenceId: string;
	occasion: string;
}) {
	await assertNameFree({ conferenceId, occasion, sessionId });
	await refusingTakenName(
		db
			.update(schema.attendanceSession)
			.set({ occasion })
			.where(whereRows({ table: schema.attendanceSession, filter: { id: sessionId } }))
	);
	attendanceSessionPubsub.updated(sessionId);
}

/** Lists the session on the participation certificates, or takes it off them. */
export async function setSessionOnCertificate({
	sessionId,
	show
}: {
	sessionId: string;
	show: boolean;
}) {
	await db
		.update(schema.attendanceSession)
		.set({ showOnCertificate: show })
		.where(whereRows({ table: schema.attendanceSession, filter: { id: sessionId } }));
	attendanceSessionPubsub.updated(sessionId);
}

/** Lets an ended session take scans again; its earlier scans stay, so nobody is scanned twice. */
export async function reopenSession(sessionId: string) {
	await db
		.update(schema.attendanceSession)
		.set({ endedAt: null })
		.where(
			whereRows({
				table: schema.attendanceSession,
				filter: { id: sessionId, endedAt: { isNotNull: true } }
			})
		);
	attendanceSessionPubsub.updated(sessionId);
}

/** Ends a session for everybody working in it; ending it again changes nothing. */
export async function endSession(sessionId: string) {
	await db
		.update(schema.attendanceSession)
		.set({ endedAt: new Date() })
		.where(
			whereRows({
				table: schema.attendanceSession,
				filter: { id: sessionId, endedAt: { isNull: true } }
			})
		);
	attendanceSessionPubsub.updated(sessionId);
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
