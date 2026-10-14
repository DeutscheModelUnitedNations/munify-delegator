import { PARTICIPANT_CARE_ROLES, assertTeamRole } from '$api/services/authHelper';
import type { Context } from '$api/context';

/** The sighting - its deck, entries, codename search and schools - is participant care's. */
export async function assertCanReadSightingDeck(ctx: Context, conferenceId: string) {
	await assertTeamRole(ctx, conferenceId, PARTICIPANT_CARE_ROLES);
}
