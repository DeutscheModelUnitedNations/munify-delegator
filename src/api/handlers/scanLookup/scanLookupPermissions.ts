import type { ApiContext } from '#api/rumble';
import { assertTeamPermission } from '#api/services/authHelper/rules';

/**
 * Refuses unless the caller is on the conference's team (any role), who all use the entrance
 * scanner. Safe for every role since the lookup answers a fixed set of fields, not the
 * participant's user and status rows.
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
