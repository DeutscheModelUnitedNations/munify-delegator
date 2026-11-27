import type { ApiContext } from '#api/rumble';
import { callerFacts, type CallerFacts } from '#api/services/authHelper/callerFacts';
import { hasTeamPermission } from '#api/services/authHelper/rules';
import { apiError } from '#api/services/errors';
import { m } from '#lib/paraglide/messages';
import { assertCanSetDocumentLayout } from '#api/handlers/conference/conferencePermissions';

/** Whether the caller supervises `userId` in the conference (the supervision outlives the registration). */
export function supervisesHolder({
	facts,
	conferenceId,
	userId
}: {
	facts: Pick<CallerFacts, 'supervised'>;
	conferenceId: string;
	userId: string;
}) {
	return facts.supervised.some(
		(person) => person.userId === userId && person.conferenceId === conferenceId
	);
}

/**
 * Refuses (FORBIDDEN, with `message`) unless the signed code about `userId` is the caller's own,
 * the caller supervises them in the conference (teachers hand out their students' application
 * documents and certificates) or holds `manageParticipants` (project management and participant
 * care) there, who hand it out for someone (the user card). Reading somebody's status (a
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
	if (userId === ctx.mustBeLoggedIn().sub) return;
	if (supervisesHolder({ facts: await callerFacts(ctx), conferenceId, userId })) return;
	if (!(await hasTeamPermission({ ctx, conferenceId, permission: 'manageParticipants' }))) {
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
