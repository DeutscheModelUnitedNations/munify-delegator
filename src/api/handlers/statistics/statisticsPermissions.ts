import type { ApiContext } from '#api/rumble';
import { assertTeamPermission } from '#api/services/authHelper/rules';

/** Refuses unless the caller is on the conference's team, in any role (`useTeamTools`). */
export async function assertCanReadStatistics({
	ctx,
	conferenceId
}: {
	ctx: ApiContext;
	conferenceId: string;
}) {
	await assertTeamPermission({ ctx, conferenceId, permission: 'useTeamTools' });
}
