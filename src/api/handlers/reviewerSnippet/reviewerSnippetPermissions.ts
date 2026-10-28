import { abilityBuilder, type ApiContext } from '#api/rumble.js';
import { systemAdmin, userId, assertAllowedById } from '#api/services/authHelper.js';
import { m } from '#lib/paraglide/messages.js';

export function registerReviewerSnippetAbilities() {
	// Ported from abilities/entities/reviewerSnippet.ts: users manage only their own snippets.
	abilityBuilder.reviewerSnippet.allow(['read', 'update', 'delete']).when(systemAdmin);

	abilityBuilder.reviewerSnippet.allow(['read', 'update', 'delete']).when((ctx) => {
		const id = userId(ctx);
		return id ? { where: { userId: id } } : undefined;
	});
}

/** Refuses unless the snippet exists and the caller may update it: it is their own. */
export async function assertCanUpdateReviewerSnippet(ctx: ApiContext, id: string) {
	await assertAllowedById(ctx, 'reviewerSnippet', 'update', id, { message: m.snippetNotFound });
}
