import type { ApiContext } from '#api/rumble';
import { assertTeamPermission } from '#api/services/authHelper';

/** The seat planning is project management's and the content lead's. */
export async function assertCanReadSeatPlanning(ctx: ApiContext, conferenceId: string) {
	await assertTeamPermission(ctx, conferenceId, 'planSeats');
}
