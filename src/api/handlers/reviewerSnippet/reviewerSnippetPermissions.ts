import { abilityBuilder, type ApiContext } from '#api/rumble';
import { systemAdmin } from '#api/services/authHelper/rules';
import { callerUserId, assertAllowed } from '#api/services/authHelper/utils';
import { m } from '#lib/paraglide/messages';

export function registerReviewerSnippetAbilities() {
	// Ported from abilities/entities/reviewerSnippet.ts: users manage only their own snippets.
	abilityBuilder.reviewerSnippet.allow(['read', 'update', 'delete']).when(systemAdmin);

	abilityBuilder.reviewerSnippet.allow(['read', 'update', 'delete']).when((ctx) => {
		const id = callerUserId(ctx);
		return id ? { where: { userId: id } } : undefined;
	});
}

/** Refuses unless the snippet exists and the caller may update it: it is their own. */
export async function assertCanUpdateReviewerSnippet(ctx: ApiContext, id: string) {
	await assertAllowed(ctx, 'reviewerSnippet', 'update', id, { message: m.snippetNotFound });
}
