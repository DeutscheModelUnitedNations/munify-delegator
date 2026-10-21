import type { Context } from '$api/context';
import { PARTICIPANT_CARE_ROLES, hasTeamRole } from '$api/services/authHelper';
import { m } from '#lib/paraglide/messages.js';
import { apiError } from '$api/services/errors/apiError';

/**
 * A certificate is the participant's own, issued by participant care: reading somebody's status
 * (a co-delegate's, say) is not enough to be handed a signed copy.
 */
export async function assertCanGetCertificate(ctx: Context, conferenceId: string, userId: string) {
	if (
		userId !== ctx.mustBeLoggedIn().sub &&
		!(await hasTeamRole(ctx, conferenceId, PARTICIPANT_CARE_ROLES))
	) {
		throw apiError('FORBIDDEN', m.certificateOnlyHolder());
	}
}
