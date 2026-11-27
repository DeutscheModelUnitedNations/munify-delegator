import type { ApiContext } from '#api/rumble';
import { assertCanIssueCodeFor } from '#api/handlers/signedCode/signedCodePermissions';
import { m } from '#lib/paraglide/messages';

/**
 * Refuses (FORBIDDEN) unless the certificate of `userId` is the caller's own, the caller supervises
 * them or holds `manageParticipants` (project management and participant care) in the conference
 * (`assertCanIssueCodeFor`).
 */
export function assertCanGetCertificate({
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
		message: m.certificateOnlyHolder()
	});
}
