import type { ApiContext } from '#api/rumble';
import { assertTeamPermission } from '#api/services/authHelper/rules';

/**
 * Refuses unless the caller holds `manageParticipants` (participant care) in the conference:
 * filtering and ordering by contact data and care status would reveal both to anyone else.
 */
export async function assertCanReadParticipantsPage({
	ctx,
	conferenceId
}: {
	ctx: ApiContext;
	conferenceId: string;
}) {
	await assertTeamPermission({ ctx, conferenceId, permission: 'manageParticipants' });
}
