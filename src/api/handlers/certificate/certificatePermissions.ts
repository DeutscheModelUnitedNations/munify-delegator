import type { ApiContext } from '#api/rumble';
import { hasTeamPermission } from '#api/services/authHelper/rules';
import { m } from '#lib/paraglide/messages';
import { apiError } from '#api/services/errors/apiError';

/**
 * A certificate is the participant's own, issued by participant care: reading somebody's status
 * (a co-delegate's, say) is not enough to be handed a signed copy.
 */
export async function assertCanGetCertificate(
	ctx: ApiContext,
	conferenceId: string,
	userId: string
) {
	if (
		userId !== ctx.mustBeLoggedIn().sub &&
		!(await hasTeamPermission(ctx, conferenceId, 'manageParticipants'))
	) {
		throw apiError('FORBIDDEN', m.certificateOnlyHolder());
	}
}
