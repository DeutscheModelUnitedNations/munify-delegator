import type { ApiContext } from '#api/rumble';
import { assertTeamPermission } from '#api/services/authHelper';

/**
 * Any team member may look a scanned code up, which the entrance scanner is for: the lookup
 * answers a fixed set of fields instead of the participant's user and status rows.
 */
export async function assertCanLookupScan(ctx: ApiContext, conferenceId: string) {
	await assertTeamPermission(ctx, conferenceId, 'useTeamTools');
}
