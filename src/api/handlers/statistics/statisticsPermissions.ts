import type { Context } from '#api/context.js';
import { assertTeamRole } from '#api/services/authHelper.js';

/** A conference's statistics are for anyone on its team. */
export async function assertCanReadStatistics(ctx: Context, conferenceId: string) {
	await assertTeamRole(ctx, conferenceId);
}
