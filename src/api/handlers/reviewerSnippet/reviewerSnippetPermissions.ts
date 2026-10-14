import { schema } from '$api/db/db';
import { abilityBuilder, type ApiContext } from '$api/rumble';
import { assertAllowedRow, systemAdmin, userId } from '$api/services/authHelper';
import { m } from '$lib/paraglide/messages';

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
	await assertAllowedRow(
		schema.reviewerSnippet,
		(await ctx.abilities.reviewerSnippet.filter('update')).merge({ where: { id } }).sql.where,
		m.snippetNotFound
	);
}

/** Refuses unless the snippet exists and the caller may delete it: it is their own. */
export async function assertCanDeleteReviewerSnippet(ctx: ApiContext, id: string) {
	await assertAllowedRow(
		schema.reviewerSnippet,
		(await ctx.abilities.reviewerSnippet.filter('delete')).merge({ where: { id } }).sql.where,
		m.snippetNotFound
	);
}
