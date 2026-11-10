import { db } from '#api/db/db';
import type { ApiContext } from '#api/rumble';
import { assertTeamPermission, teamConference } from '#api/services/authHelper/rules';
import { assertFindFirstExists } from '@m1212e/rumble';

/** Refuses (FORBIDDEN) unless the caller manages the conference's participants. */
export function assertCanIssueNsaCards({
	ctx,
	conferenceId
}: {
	ctx: ApiContext;
	conferenceId: string;
}) {
	return assertTeamPermission({ ctx, conferenceId, permission: 'manageParticipants' });
}

/**
 * The participant row a new card is printed for, when the caller manages the participants of its
 * conference (NOT_FOUND otherwise).
 */
export async function participantForNewCard({
	ctx,
	conferenceParticipantId
}: {
	ctx: ApiContext;
	conferenceParticipantId: string;
}) {
	return db.query.conferenceParticipant
		.findFirst({
			where: {
				id: conferenceParticipantId,
				conference: await teamConference({ ctx, permission: 'manageParticipants' })
			},
			columns: { id: true, conferenceId: true }
		})
		.then(assertFindFirstExists);
}
