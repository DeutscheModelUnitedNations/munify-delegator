import type { ApiContext } from '$api/rumble';
import { PARTICIPANT_CARE_ROLES, assertTeamRole } from '$api/services/authHelper';

/** The nametag handout is participant care's. */
export async function assertCanReadNametagBins(ctx: ApiContext, conferenceId: string) {
	await assertTeamRole(ctx, conferenceId, PARTICIPANT_CARE_ROLES);
}
