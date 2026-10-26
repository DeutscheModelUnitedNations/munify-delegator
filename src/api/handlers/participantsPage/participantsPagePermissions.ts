import type { Context } from '#api/context.js';
import { PARTICIPANT_CARE_ROLES, assertTeamRole } from '#api/services/authHelper.js';

/**
 * The participants table is the care team's: filtering and ordering by contact data and care
 * status would otherwise reveal it to people who may not read it.
 */
export async function assertCanReadParticipantsPage(ctx: Context, conferenceId: string) {
	await assertTeamRole(ctx, conferenceId, PARTICIPANT_CARE_ROLES);
}
