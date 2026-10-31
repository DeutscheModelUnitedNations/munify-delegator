import type { ApiContext } from '#api/rumble';
import { assertTeamPermission } from '#api/services/authHelper/rules';

/** Refuses unless the caller holds `manageParticipants` (participant care) in the conference. */
export async function assertCanReadNametagBins({
	ctx,
	conferenceId
}: {
	ctx: ApiContext;
	conferenceId: string;
}) {
	await assertTeamPermission({ ctx, conferenceId, permission: 'manageParticipants' });
}
