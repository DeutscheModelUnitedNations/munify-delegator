import { db, schema } from '$api/db/db';
import {
	fetchUserParticipations,
	isUserAlreadyRegistered
} from '$api/services/registration/participation';
import { makeEntryCode } from '$api/services/registration/entryCodeGenerator';
import { assertFindFirstExists, assertFirstEntryExists } from '@m1212e/rumble';
import { m } from '$lib/paraglide/messages';
import { apiError } from '$api/services/apiError';

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

/**
 * Attaches a participant to the supervisor holding the connection code. Returns the supervisor
 * and the participations that now have a link, so the caller can announce them.
 */
export async function connectParticipantToSupervisor(
	conferenceId: string,
	connectionCode: string,
	subjectId: string
) {
	const supervisor = await db.query.conferenceSupervisor
		.findFirst({
			where: { conferenceId, connectionCode: normalizeConnectionCode(connectionCode) }
		})
		.then(assertFindFirstExists);

	const participation = await fetchUserParticipations({ conferenceId, userId: subjectId });

	if (participation.foundSupervisor || participation.foundTeamMember) {
		throw apiError('CONFLICT', m.supervisorAlreadySupervisorOrTeam());
	}
	if (!participation.foundDelegationMember && !participation.foundSingleParticipant) {
		throw apiError('FORBIDDEN', m.supervisorNotParticipant());
	}

	// Both supervision links are many-to-many join tables.
	if (participation.foundDelegationMember) {
		await db
			.insert(schema.conferenceSupervisorToDelegationMember)
			.values({ a: supervisor.id, b: participation.foundDelegationMember.id })
			.onConflictDoNothing();
	}
	if (participation.foundSingleParticipant) {
		await db
			.insert(schema.conferenceSupervisorToSingleParticipant)
			.values({ a: supervisor.id, b: participation.foundSingleParticipant.id })
			.onConflictDoNothing();
	}

	return {
		supervisorId: supervisor.id,
		delegationMemberId: participation.foundDelegationMember?.id,
		singleParticipantId: participation.foundSingleParticipant?.id
	};
}

/**
 * Shows whose supervision a participant is about to accept, before they connect. The caller has
 * to take part in the conference in some role, so an arbitrary logged-in user cannot probe codes.
 */
export async function previewSupervisorByCode(
	conferenceId: string,
	connectionCode: string,
	callerId: string
) {
	const participation = await fetchUserParticipations({ conferenceId, userId: callerId });

	if (
		!participation.foundDelegationMember &&
		!participation.foundSingleParticipant &&
		!participation.foundTeamMember &&
		!participation.foundSupervisor
	) {
		throw apiError('FORBIDDEN', m.notRegisteredForConference());
	}

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
