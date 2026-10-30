import type { ApiContext } from '#api/rumble';
import { assertTeamPermission } from '#api/services/authHelper';

/**
 * The participants table is the care team's: filtering and ordering by contact data and care
 * status would otherwise reveal it to people who may not read it.
 */
export async function assertCanReadParticipantsPage(ctx: ApiContext, conferenceId: string) {
	await assertTeamPermission(ctx, conferenceId, 'manageParticipants');
}
