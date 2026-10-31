import type { ApiContext } from '#api/rumble';
import { assertTeamPermission } from '#api/services/authHelper/rules';
import { assertSessionOfConference } from '#api/handlers/attendanceEntry/attendanceEntryPermissions';

/**
 * Refuses (FORBIDDEN) unless the caller holds `useTeamTools` in the conference, which every team
 * role does: the whole team works the entrance scanner. Safe for every role since the lookup
 * answers a fixed set of fields, not the participant's user and status rows. A session the lookup
 * names has to be one of the conference's (INVALID_INPUT otherwise).
 */
export async function assertCanLookupScan({
	ctx,
	conferenceId,
	sessionId
}: {
	ctx: ApiContext;
	conferenceId: string;
	sessionId?: string | null;
}) {
	await assertTeamPermission({ ctx, conferenceId, permission: 'useTeamTools' });
	if (sessionId) await assertSessionOfConference({ sessionId, conferenceId });
}
