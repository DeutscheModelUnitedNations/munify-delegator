import { assertTeamRole } from '$api/services/authHelper';
import type { Context } from '$api/context';

/**
 * Any team member may look a scanned code up, which the entrance scanner is for: the lookup
 * answers a fixed set of fields instead of the participant's user and status rows.
 */
export async function assertCanLookupScan(ctx: Context, conferenceId: string) {
	await assertTeamRole(ctx, conferenceId);
}
