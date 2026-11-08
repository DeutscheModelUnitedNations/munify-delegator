import type { ApiContext } from '#api/rumble';
import { hasTeamPermission } from '#api/services/authHelper/rules';
import { apiError } from '#api/services/errors';
import { m } from '#lib/paraglide/messages';

/**
 * Refuses (FORBIDDEN, with `message`) unless the signed code about `userId` is the caller's own or
 * the caller holds `manageParticipants` (project management and participant care) in the
 * conference, who hand it out for someone (the user card). Reading somebody's status (a
 * co-delegate's, say) is not enough to be handed a signed copy. Certificates go by it too.
 */
export async function assertCanIssueCodeFor({
	ctx,
	conferenceId,
	userId,
	message
}: {
	ctx: ApiContext;
	conferenceId: string;
	userId: string;
	message: string;
}) {
	if (
		userId !== ctx.mustBeLoggedIn().sub &&
		!(await hasTeamPermission({ ctx, conferenceId, permission: 'manageParticipants' }))
	) {
		throw apiError({ code: 'FORBIDDEN', message });
	}
}

/** The code of a person's application documents (`assertCanIssueCodeFor`). */
export function assertCanIssuePrintCode({
	ctx,
	conferenceId,
	userId
}: {
	ctx: ApiContext;
	conferenceId: string;
	userId: string;
}) {
	return assertCanIssueCodeFor({
		ctx,
		conferenceId,
		userId,
		message: m.documentCodeOnlyHolder()
	});
}
