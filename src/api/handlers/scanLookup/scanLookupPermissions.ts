import type { ApiContext } from '#api/rumble';
import { assertTeamPermission } from '#api/services/authHelper/rules';

/**
 * Any team member may look a scanned code up, which the entrance scanner is for: the lookup
 * answers a fixed set of fields instead of the participant's user and status rows.
 */
export async function assertCanLookupScan({
	ctx,
	conferenceId
}: {
	ctx: ApiContext;
	conferenceId: string;
}) {
	await assertTeamPermission({ ctx, conferenceId, permission: 'useTeamTools' });
}
