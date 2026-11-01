import type { ApiContext } from '#api/rumble';
import { hasTeamPermission } from '#api/services/authHelper/rules';
import { m } from '#lib/paraglide/messages';
import { apiError } from '#api/services/errors';

/**
 * Refuses (FORBIDDEN) unless the certificate of `userId` is the caller's own or the caller holds
 * `manageParticipants` (project management and participant care) in the conference. Reading
 * somebody's status (a co-delegate's, say) is not enough to be handed a signed copy.
 */
export async function assertCanGetCertificate({
	ctx,
	conferenceId,
	userId
}: {
	ctx: ApiContext;
	conferenceId: string;
	userId: string;
}) {
	if (
		userId !== ctx.mustBeLoggedIn().sub &&
		!(await hasTeamPermission({ ctx, conferenceId, permission: 'manageParticipants' }))
	) {
		throw apiError({ code: 'FORBIDDEN', message: m.certificateOnlyHolder() });
	}
}
