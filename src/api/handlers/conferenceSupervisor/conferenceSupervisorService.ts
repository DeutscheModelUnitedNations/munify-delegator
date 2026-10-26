import { db, schema } from '$api/db/db';
import { resolveSchoolChoice, type SchoolChoice } from '$api/handlers/school/schoolService';
import {
	ensureConferenceParticipant,
	setParticipantSchool
} from '$api/handlers/conferenceParticipant/conferenceParticipantService';
import { isUserAlreadyRegistered } from '$api/services/registration/participation';
import { makeEntryCode } from '$api/services/registration/entryCodeGenerator';
import { assertFindFirstExists, assertFirstEntryExists } from '@m1212e/rumble';
import { m } from '#lib/paraglide/messages.js';
import { apiError } from '$api/services/errors/apiError';
import { eq } from 'drizzle-orm';

/** Codes are generated uppercase, but people type them in lowercase or paste whitespace along. */
const normalizeConnectionCode = (code: string) => code.trim().toUpperCase();

/**
 * A connection code no supervisor holds yet, in any conference: the codes are unique across
 * conferences (a unique index), so a code alone names its supervisor. 20^6 codes make a clash
 * rare; drawing again on one keeps it from turning into an error.
 */
async function unusedConnectionCode() {
	for (;;) {
		const code = makeEntryCode();
		const holder = await db.query.conferenceSupervisor.findFirst({
			where: { connectionCode: code },
			columns: { id: true }
		});
		if (!holder) return code;
	}
}

/** Registers a user as supervisor of a conference. Returns the new row's id. */
export async function registerSupervisor(
	args: SchoolChoice & {
		conferenceId: string;
		subjectId: string;
		plansOwnAttendenceAtConference?: boolean | null;
	}
) {
	if (await isUserAlreadyRegistered({ userId: args.subjectId, conferenceId: args.conferenceId })) {
		throw apiError('CONFLICT', m.supervisorUserHasOtherRole());
	}

	const connectionCode = await unusedConnectionCode();
	// The person's row and the supervisor entry go in together, so a refused insert leaves neither.
	const created = await db.transaction(async (tx) => {
		const participantId = await ensureConferenceParticipant(tx, args.conferenceId, args.subjectId);
		const schoolId = await resolveSchoolChoice(args, tx);
		await setParticipantSchool(tx, [participantId], schoolId);
		return tx
			.insert(schema.conferenceSupervisor)
			.values({
				conferenceParticipantId: participantId,
				plansOwnAttendenceAtConference: args.plansOwnAttendenceAtConference ?? true,
				connectionCode,
				schoolId: schoolId ?? undefined
			})
			.returning()
			.then(assertFirstEntryExists);
	});

	return created.id;
}

/**
 * The supervisor holding the connection code. A code is unique across conferences; the conference
 * is still checked, so a code from another conference is not found.
 */
export async function findSupervisorByConnectionCode(conferenceId: string, connectionCode: string) {
	return db.query.conferenceSupervisor
		.findFirst({
			where: {
				connectionCode: normalizeConnectionCode(connectionCode),
				participant: { conferenceId }
			}
		})
		.then(assertFindFirstExists);
}

/**
 * Attaches a participant to a supervisor, through the participation `assertCanBeSupervised`
 * found. The link is to the person (`conferenceParticipant`), so it outlives the registration.
 * Returns the supervisor and the registration that is now supervised, so the caller can announce
 * them.
 */
export async function connectParticipantToSupervisor(
	supervisorId: string,
	participation: {
		foundDelegationMember?: { id: string; conferenceParticipantId: string } | null;
		foundSingleParticipant?: { id: string; conferenceParticipantId: string } | null;
	}
) {
	const participantId =
		participation.foundDelegationMember?.conferenceParticipantId ??
		participation.foundSingleParticipant?.conferenceParticipantId;
	if (participantId) {
		await db
			.insert(schema.supervision)
			.values({ a: supervisorId, b: participantId })
			.onConflictDoNothing();
	}

	return {
		supervisorId,
		delegationMemberId: participation.foundDelegationMember?.id,
		singleParticipantId: participation.foundSingleParticipant?.id
	};
}

/**
 * Shows whose supervision a participant is about to accept, before they connect. The caller
 * checks first that they may look (`assertCanPreviewConferenceSupervisor`).
 */
export async function previewSupervisorByCode(conferenceId: string, connectionCode: string) {
	const supervisor = await db.query.conferenceSupervisor
		.findFirst({
			where: {
				connectionCode: normalizeConnectionCode(connectionCode),
				participant: { conferenceId }
			},
			with: { user: { columns: { givenName: true, familyName: true } } }
		})
		.then(assertFindFirstExists);

	return {
		given_name: supervisor.user?.givenName ?? null,
		family_name: supervisor.user?.familyName ?? null
	};
}

/** Hands the supervisor a new connection code; the old one stops working. */
export async function rotateConnectionCode(supervisorId: string) {
	await db
		.update(schema.conferenceSupervisor)
		.set({ connectionCode: await unusedConnectionCode() })
		.where(eq(schema.conferenceSupervisor.id, supervisorId));
}
