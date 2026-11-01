import type { ApiContext } from '#api/rumble';
import { assertTeamPermission } from '#api/services/authHelper/rules';

/**
 * Refuses (FORBIDDEN) unless the caller holds `useTeamTools` in the conference, which every team
 * role does: the statistics page is open to the whole team. It shows only aggregates.
 */
export async function assertCanReadStatistics({
	ctx,
	conferenceId
}: {
	ctx: ApiContext;
	conferenceId: string;
}) {
	await assertTeamPermission({ ctx, conferenceId, permission: 'useTeamTools' });
}
