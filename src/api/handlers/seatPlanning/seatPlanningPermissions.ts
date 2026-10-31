import type { ApiContext } from '#api/rumble';
import { assertTeamPermission } from '#api/services/authHelper/rules';

/**
 * Refuses unless the caller holds `planSeats` (project management and content lead) in the
 * conference.
 */
export async function assertCanReadSeatPlanning({
	ctx,
	conferenceId
}: {
	ctx: ApiContext;
	conferenceId: string;
}) {
	await assertTeamPermission({ ctx, conferenceId, permission: 'planSeats' });
}
