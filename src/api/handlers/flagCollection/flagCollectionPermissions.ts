import type { ApiContext } from '#api/rumble';
import { assertTeamPermission } from '#api/services/authHelper/rules';

/**
 * Refuses (FORBIDDEN) unless the caller holds `reviewPapers` (the team but plain members) in the
 * conference: the flag collection is the reviewers' view of the paper progress.
 */
export async function assertCanReadFlagCollection({
	ctx,
	conferenceId
}: {
	ctx: ApiContext;
	conferenceId: string;
}) {
	await assertTeamPermission({ ctx, conferenceId, permission: 'reviewPapers' });
}
