import { abilityBuilder, type ApiContext } from '#api/rumble';
import { systemAdmin } from '#api/services/authHelper/rules';
import { callerUserId, assertAllowed } from '#api/services/authHelper/utils';
import { m } from '#lib/paraglide/messages';

/** The abilities of reviewer snippets, a reviewer's own text blocks. Anybody signed in creates them. */
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
