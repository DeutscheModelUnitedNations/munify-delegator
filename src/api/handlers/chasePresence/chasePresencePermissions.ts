import type { ApiContext } from '#api/rumble';
import { assertTeamPermission } from '#api/services/authHelper/rules';

/** Participant care decides who attended, from what CHASE recorded (the attendance import page). */
export function assertCanReadChasePresence({
	ctx,
	conferenceId
}: {
	ctx: ApiContext;
	conferenceId: string;
}) {
	return assertTeamPermission({ ctx, conferenceId, permission: 'manageParticipants' });
}
