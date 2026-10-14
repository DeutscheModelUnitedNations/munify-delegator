import type { ApiContext } from '$api/rumble';
import { SEAT_PLANNING_ROLES, assertTeamRole } from '$api/services/authHelper';

/** The seat planning is project management's and the content lead's. */
export async function assertCanReadSeatPlanning(ctx: ApiContext, conferenceId: string) {
	await assertTeamRole(ctx, conferenceId, SEAT_PLANNING_ROLES);
}
