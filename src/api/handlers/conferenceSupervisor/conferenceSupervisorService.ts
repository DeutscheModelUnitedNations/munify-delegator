import { db, schema } from '$api/db/db';
import { isUserAlreadyRegistered } from '$api/services/registration/participation';
import { makeEntryCode } from '$api/services/registration/entryCodeGenerator';
import { assertFindFirstExists, assertFirstEntryExists } from '@m1212e/rumble';
import { m } from '$lib/paraglide/messages';
import { apiError } from '$api/services/errors/apiError';
import { eq } from 'drizzle-orm';

/** Codes are generated uppercase, but people type them in lowercase or paste whitespace along. */
const normalizeConnectionCode = (code: string) => code.trim().toUpperCase();

/** Registers a user as supervisor of a conference. Returns the new row's id. */
export async function registerSupervisor(args: {
	conferenceId: string;
	subjectId: string;
	plansOwnAttendenceAtConference?: boolean | null;
}) {
	if (await isUserAlreadyRegistered({ userId: args.subjectId, conferenceId: args.conferenceId })) {
		throw apiError('CONFLICT', m.supervisorUserHasOtherRole());
	}

	const created = await db
		.insert(schema.conferenceSupervisor)
		.values({
			conferenceId: args.conferenceId,
			userId: args.subjectId,
			plansOwnAttendenceAtConference: args.plansOwnAttendenceAtConference ?? true,
			connectionCode: makeEntryCode()
		})
		.returning()
		.then(assertFirstEntryExists);

	return created.id;
}

/** The supervisor holding the connection code in the conference. */
export async function findSupervisorByConnectionCode(conferenceId: string, connectionCode: string) {
	return db.query.conferenceSupervisor
		.findFirst({
			where: { conferenceId, connectionCode: normalizeConnectionCode(connectionCode) }
		})
		.then(assertFindFirstExists);
}

/**
 * Attaches a participant to a supervisor, through the participations `assertCanBeSupervised`
 * found. Returns the supervisor and the participations that now have a link, so the caller can
 * announce them.
 */
export async function connectParticipantToSupervisor(
	supervisorId: string,
	participation: {
		foundDelegationMember?: { id: string } | null;
		foundSingleParticipant?: { id: string } | null;
	}
) {
	// Both supervision links are many-to-many join tables.
	if (participation.foundDelegationMember) {
		await db
			.insert(schema.conferenceSupervisorToDelegationMember)
			.values({ a: supervisorId, b: participation.foundDelegationMember.id })
			.onConflictDoNothing();
	}
	if (participation.foundSingleParticipant) {
		await db
			.insert(schema.conferenceSupervisorToSingleParticipant)
			.values({ a: supervisorId, b: participation.foundSingleParticipant.id })
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
			where: { conferenceId, connectionCode: normalizeConnectionCode(connectionCode) },
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
		.set({ connectionCode: makeEntryCode() })
		.where(eq(schema.conferenceSupervisor.id, supervisorId));
}
