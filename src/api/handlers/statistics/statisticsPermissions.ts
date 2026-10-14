import type { Context } from '$api/context';
import { assertTeamRole } from '$api/services/authHelper';

/** A conference's statistics are for anyone on its team. */
export async function assertCanReadStatistics(ctx: Context, conferenceId: string) {
	await assertTeamRole(ctx, conferenceId);
}
