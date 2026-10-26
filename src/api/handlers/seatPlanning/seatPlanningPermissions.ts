import type { ApiContext } from '#api/rumble.js';
import { SEAT_PLANNING_ROLES, assertTeamRole } from '#api/services/authHelper.js';

/** The seat planning is project management's and the content lead's. */
export async function assertCanReadSeatPlanning(ctx: ApiContext, conferenceId: string) {
	await assertTeamRole(ctx, conferenceId, SEAT_PLANNING_ROLES);
}
