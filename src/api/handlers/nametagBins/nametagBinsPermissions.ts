import type { ApiContext } from '#api/rumble.js';
import { PARTICIPANT_CARE_ROLES, assertTeamRole } from '#api/services/authHelper.js';

/** The nametag handout is participant care's. */
export async function assertCanReadNametagBins(ctx: ApiContext, conferenceId: string) {
	await assertTeamRole(ctx, conferenceId, PARTICIPANT_CARE_ROLES);
}
