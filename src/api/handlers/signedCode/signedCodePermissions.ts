import type { ApiContext } from '#api/rumble';
import { hasTeamPermission } from '#api/services/authHelper/rules';
import { apiError } from '#api/services/errors';
import { m } from '#lib/paraglide/messages';
import { assertCanSetDocumentLayout } from '#api/handlers/conference/conferencePermissions';

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

/**
 * The codes of a person's application documents (`assertCanIssueCodeFor`); a test print of a
 * layout being edited (`draft`) only for those who may edit it.
 */
export async function assertCanIssuePrintCodes({
	ctx,
	conferenceId,
	userId,
	draft
}: {
	ctx: ApiContext;
	conferenceId: string;
	userId: string;
	draft: boolean;
}) {
	await assertCanIssueCodeFor({ ctx, conferenceId, userId, message: m.documentCodeOnlyHolder() });
	if (draft) await assertCanSetDocumentLayout({ ctx, conferenceId });
}
