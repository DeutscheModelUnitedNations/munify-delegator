import { db, schema } from '#api/db/db';
import {
	conferenceSupervisorPubsub,
	delegationMemberPubsub,
	conferenceParticipantPubsub,
	singleParticipantPubsub
} from '#api/pubsub';
import { resolveSchoolChoice, type SchoolChoice } from '#api/handlers/school/schoolService';
import {
	ensureConferenceParticipant,
	setParticipantSchool
} from '#api/handlers/conferenceParticipant/conferenceParticipantService';
import { isParticipantOrTeamMember } from '#api/services/registration/participation';
import { assertRegistrationOpen } from '#api/services/registration/applicationReadiness';
import { makeEntryCode } from '#api/services/registration/entryCodeGenerator';
import { normalizeEntryCode } from '#lib/helpers/entryCode';
import { assertFirstEntryExists } from '@m1212e/rumble';
import { m } from '#lib/paraglide/messages';
import { apiError, codeNotFound } from '#api/services/errors';
import { whereRows } from '#api/db/whereRows';
import { supervisorPreview } from './supervisorPreview';

/**
 * A connection code no supervisor holds yet, in any conference: the codes are unique across
 * conferences (a unique index), so a code alone names its supervisor. 20^8 codes make a clash
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

/**
 * Registers a user as supervisor of a conference, with the school they name as their own. Refuses
 * (CONFLICT) somebody who takes part in the conference already or is on its team, and a
 * registration of one's own outside the registration window. Returns the new row's id.
 */
export async function registerSupervisor(
	args: SchoolChoice & {
		conferenceId: string;
		subjectId: string;
		plansOwnAttendenceAtConference?: boolean | null;
		/** Whether the user registers themselves; the team registering somebody else may in any stage. */
		selfService: boolean;
	}
) {
	if (args.selfService) await assertRegistrationOpen(args.conferenceId);
	if (
		await isParticipantOrTeamMember({ userId: args.subjectId, conferenceId: args.conferenceId })
	) {
		throw apiError({ code: 'CONFLICT', message: m.supervisorUserHasOtherRole() });
	}

	const connectionCode = await unusedConnectionCode();
	// The person's row and the supervisor entry go in together, so a refused insert leaves neither.
	const created = await db.transaction(async (tx) => {
		const participantId = await ensureConferenceParticipant({
			tx,
			conferenceId: args.conferenceId,
			userId: args.subjectId
		});
		// The school they name is their own; the registration keeps none.
		await setParticipantSchool({
			tx,
			participantIds: [participantId],
			schoolId: await resolveSchoolChoice({ choice: args, tx })
		});
		return tx
			.insert(schema.conferenceSupervisor)
			.values({
				conferenceParticipantId: participantId,
				plansOwnAttendenceAtConference: args.plansOwnAttendenceAtConference ?? true,
				connectionCode
			})
			.returning()
			.then(assertFirstEntryExists);
	});
	conferenceSupervisorPubsub.created();

	return created.id;
}

/**
 * The supervisor holding the connection code. A code is unique across conferences; the conference
 * is still checked, so a code from another conference is not found.
 */
export async function findSupervisorByConnectionCode({
	conferenceId,
	connectionCode
}: {
	conferenceId: string;
	connectionCode: string;
}) {
	const supervisor = await db.query.conferenceSupervisor.findFirst({
		where: {
			connectionCode: normalizeEntryCode(connectionCode),
			participant: { conferenceId }
		}
	});
	if (!supervisor) throw codeNotFound();
	return supervisor;
}

/**
 * Attaches a participant to a supervisor, through the participation `assertCanBeSupervised`
 * found. The link is to the person (`conferenceParticipant`), so it outlives the registration.
 */
export async function connectParticipantToSupervisor({
	supervisorId,
	participation
}: {
	supervisorId: string;
	participation: {
		foundDelegationMember?: { id: string; conferenceParticipantId: string } | null;
		foundSingleParticipant?: { id: string; conferenceParticipantId: string } | null;
	};
}) {
	const participantId =
		participation.foundDelegationMember?.conferenceParticipantId ??
		participation.foundSingleParticipant?.conferenceParticipantId;
	if (!participantId) return;
	await db
		.insert(schema.supervision)
		.values({ a: supervisorId, b: participantId })
		.onConflictDoNothing();

	// Nothing on these rows changed, but who supervises whom did.
	conferenceSupervisorPubsub.updated(supervisorId);
	conferenceParticipantPubsub.updated(participantId);
	const delegationMemberId = participation.foundDelegationMember?.id;
	if (delegationMemberId) delegationMemberPubsub.updated(delegationMemberId);
	const singleParticipantId = participation.foundSingleParticipant?.id;
	if (singleParticipantId) singleParticipantPubsub.updated(singleParticipantId);
}

/** Ends a supervision: the supervisor no longer looks after the person. */
export async function disconnectParticipantFromSupervisor({
	supervisorId,
	conferenceId,
	subjectId
}: {
	supervisorId: string;
	conferenceId: string;
	subjectId: string;
}) {
	const participant = await db.query.conferenceParticipant.findFirst({
		where: { conferenceId, userId: subjectId },
		columns: { id: true },
		with: {
			delegationMember: { columns: { id: true } },
			singleParticipant: { columns: { id: true } }
		}
	});
	if (!participant) return;

	await db
		.delete(schema.supervision)
		.where(
			whereRows({ table: schema.supervision, filter: { a: supervisorId, b: participant.id } })
		);

	conferenceSupervisorPubsub.updated(supervisorId);
	conferenceParticipantPubsub.updated(participant.id);
	const delegationMemberId = participant.delegationMember?.id;
	if (delegationMemberId) delegationMemberPubsub.updated(delegationMemberId);
	const singleParticipantId = participant.singleParticipant?.id;
	if (singleParticipantId) singleParticipantPubsub.updated(singleParticipantId);
}

/**
 * Shows whose supervision a participant is about to accept, before they connect; a wrong code is
 * NOT_FOUND. The caller checks first that they may look (`assertCanPreviewConferenceSupervisor`).
 */
export async function previewSupervisorByCode({
	conferenceId,
	connectionCode,
	callerId
}: {
	conferenceId: string;
	connectionCode: string;
	callerId: string;
}) {
	const supervisor = await db.query.conferenceSupervisor.findFirst({
		where: {
			connectionCode: normalizeEntryCode(connectionCode),
			participant: { conferenceId }
		},
		with: {
			user: { columns: { givenName: true, familyName: true } },
			participant: { with: { school: { columns: { id: true, name: true, city: true } } } }
		}
	});
	if (!supervisor) throw codeNotFound();
	const caller = await db.query.conferenceParticipant.findFirst({
		where: { conferenceId, userId: callerId },
		columns: { schoolId: true }
	});
	return supervisorPreview({ supervisor, callerSchoolId: caller?.schoolId });
}

/**
 * Changes a supervisor's row; an absent field is left as it is. A rotated connection code makes
 * the old one stop working, people already connected stay so.
 */
export async function updateConferenceSupervisor({
	id,
	plansOwnAttendenceAtConference,
	rotateConnectionCode
}: {
	id: string;
	plansOwnAttendenceAtConference?: boolean | null;
	rotateConnectionCode?: boolean;
}) {
	const values = {
		plansOwnAttendenceAtConference: plansOwnAttendenceAtConference ?? undefined,
		connectionCode: rotateConnectionCode ? await unusedConnectionCode() : undefined
	};
	// drizzle refuses an empty `set`
	if (Object.values(values).some((value) => value !== undefined)) {
		await db
			.update(schema.conferenceSupervisor)
			.set(values)
			.where(whereRows({ table: schema.conferenceSupervisor, filter: { id } }));
	}
	conferenceSupervisorPubsub.updated(id);
}
