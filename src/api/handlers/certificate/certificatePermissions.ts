import type { ApiContext } from '#api/rumble';
import { assertCanIssueCodeFor } from '#api/handlers/signedCode/signedCodePermissions';
import { m } from '#lib/paraglide/messages';

/**
 * Refuses (FORBIDDEN) unless the certificate of `userId` is the caller's own or the caller holds
 * `manageParticipants` (project management and participant care) in the conference. Reading
 * somebody's status (a co-delegate's, say) is not enough to be handed a signed copy.
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
