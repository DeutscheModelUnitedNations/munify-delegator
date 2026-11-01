import { db } from '#api/db/db';
import { abilityBuilder, type ApiContext } from '#api/rumble';
import { isSystemAdmin, systemAdmin, teamConference } from '#api/services/authHelper/rules';
import { apiError } from '#api/services/errors';
import { callerUserId, assertAllowed } from '#api/services/authHelper/utils';
import { m } from '#lib/paraglide/messages';

/**
 * The abilities of reviewer snippets, a reviewer's own text blocks. Creating one is for the paper
 * team (`assertCanCreateReviewerSnippet`).
 */
export function registerReviewerSnippetAbilities() {
	abilityBuilder.reviewerSnippet.allow(['read', 'update', 'delete']).when(systemAdmin);

	// Everybody reads, updates and deletes their own snippets, and nobody else's.
	abilityBuilder.reviewerSnippet.allow(['read', 'update', 'delete']).when((ctx) => {
		const id = callerUserId(ctx);
		return id ? { where: { userId: id } } : undefined;
	});
}

/** Refuses (NOT_FOUND) unless the snippet exists and is the caller's own (the update ability). */
export async function assertCanUpdateReviewerSnippet({ ctx, id }: { ctx: ApiContext; id: string }) {
	await assertAllowed({
		ctx,
		table: 'reviewerSnippet',
		action: 'update',
		id,
		options: { message: m.snippetNotFound }
	});
}

/**
 * Refuses (FORBIDDEN) unless the caller holds `reviewPapers` (reviewer, project management,
 * participant care, team coordinator, content lead) in some conference, or is a system admin:
 * snippets are text blocks for paper reviews. Returns the caller's user id, the snippet's owner.
 */
export async function assertCanCreateReviewerSnippet(ctx: ApiContext) {
	const callerId = ctx.mustBeLoggedIn().sub;
	if (isSystemAdmin(ctx)) return { callerId };
	const reviewsSomewhere = await db.query.conference.findFirst({
		where: teamConference({ ctx, permission: 'reviewPapers' }),
		columns: { id: true }
	});
	if (!reviewsSomewhere) {
		throw apiError({ code: 'FORBIDDEN', message: m.snippetsOnlyForReviewers() });
	}
	return { callerId };
}
