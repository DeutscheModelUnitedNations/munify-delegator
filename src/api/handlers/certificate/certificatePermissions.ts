import type { ApiContext } from '#api/rumble';
import { assertTeamPermission } from '#api/services/authHelper/rules';
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

/** Refuses (FORBIDDEN) unless the caller holds `manageParticipants` in the conference. */
export async function assertCanCountCertificates({
	ctx,
	conferenceId
}: {
	ctx: ApiContext;
	conferenceId: string;
}) {
	await assertTeamPermission({ ctx, conferenceId, permission: 'manageParticipants' });
}
