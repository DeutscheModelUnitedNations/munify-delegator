import type { ApiContext } from '#api/rumble';
import { assertTeamPermission } from '#api/services/authHelper/rules';
import { callerUserId } from '#api/services/authHelper/utils';

/**
 * Refuses (FORBIDDEN) unless the caller holds `manageParticipants` (project management and
 * participant care) in the conference, whose tool the plausibility page is.
 */
export async function assertCanReadPlausibility({
	ctx,
	conferenceId
}: {
	ctx: ApiContext;
	conferenceId: string;
}) {
	await assertTeamPermission({ ctx, conferenceId, permission: 'manageParticipants' });
}

/**
 * The caller, who only ever asks about their own age; refuses (UNAUTHENTICATED) without a session.
 * Undefined for an AI assistant, which acts for nobody's own part.
 */
export function ownAgeNoticeUser(ctx: ApiContext) {
	ctx.mustBeLoggedIn();
	return callerUserId(ctx);
}
