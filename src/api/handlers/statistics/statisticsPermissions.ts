import type { ApiContext } from '#api/rumble';
import { assertTeamPermission } from '#api/services/authHelper/rules';

/** A conference's statistics are for anyone on its team. */
export async function assertCanReadStatistics(ctx: ApiContext, conferenceId: string) {
	await assertTeamPermission(ctx, conferenceId, 'useTeamTools');
}
