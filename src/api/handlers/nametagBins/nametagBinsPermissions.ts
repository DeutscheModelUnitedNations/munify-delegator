import type { ApiContext } from '#api/rumble';
import { assertTeamPermission } from '#api/services/authHelper/rules';

/**
 * Refuses (FORBIDDEN) unless the caller holds `manageParticipants` (project management and
 * participant care) in the conference, who hand out the nametags.
 */
export async function assertCanReadNametagBins({
	ctx,
	conferenceId
}: {
	ctx: ApiContext;
	conferenceId: string;
}) {
	await assertTeamPermission({ ctx, conferenceId, permission: 'manageParticipants' });
}

/**
 * Everybody signed in reads their own nametag table (UNAUTHENTICATED otherwise); whether they hold
 * a seat they may see is the service's to tell. Returns the caller's user id.
 */
export function assertCanReadOwnNametagTable(ctx: ApiContext) {
	return { callerId: ctx.mustBeLoggedIn().sub };
}
