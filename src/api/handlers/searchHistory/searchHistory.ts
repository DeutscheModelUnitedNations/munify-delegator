import { db, schema } from '$api/db/db';
import { abilityBuilder, object, query, schemaBuilder } from '$api/rumble';
import { assertTeamRole, systemAdmin, userId, where } from '$api/services/authHelper';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { searchHistoryPubsub } from '$api/pubsub';
import { m } from '$lib/paraglide/messages';
import { apiError } from '$api/services/apiError';

/** How many searches a person keeps. The search only offers the newest five. */
const KEPT_ENTRIES = 20;
const MAX_LABEL_LENGTH = 200;

// A history is only ever read by the person who made it, from any of their devices.
abilityBuilder.searchHistory.allow(['read', 'update', 'delete']).when(systemAdmin);
abilityBuilder.searchHistory.allow('read').when((ctx) => {
	const id = userId(ctx);
	return where(id ? { userId: id } : undefined);
});

object({ table: 'searchHistory' });
query({ table: 'searchHistory' });

schemaBuilder.mutationFields((t) => ({
	/**
	 * Records a result the caller picked in the search. Picking the same result again moves it to
	 * the top instead of listing it twice, and only the newest entries are kept.
	 */
	recordSearch: t.field({
		type: 'Boolean',
		args: {
			conferenceId: t.arg.id({ required: true }),
			originId: t.arg.string({ required: true }),
			resultId: t.arg.string({ required: true }),
			label: t.arg.string({ required: true })
		},
		resolve: async (_root, args, ctx) => {
			await assertTeamRole(ctx, args.conferenceId);
			const id = userId(ctx);
			if (!id) throw apiError('UNAUTHENTICATED', m.mustBeLoggedIn());

			const label = args.label.trim().slice(0, MAX_LABEL_LENGTH);
			if (!label || !args.resultId)
				throw apiError('INVALID_INPUT', m.searchHistoryNeedsIdAndLabel());

			const { searchHistory } = schema;
			await db.transaction(async (tx) => {
				await tx
					.delete(searchHistory)
					.where(
						and(
							eq(searchHistory.userId, id),
							eq(searchHistory.conferenceId, args.conferenceId),
							eq(searchHistory.resultId, args.resultId)
						)
					);
				await tx.insert(searchHistory).values({
					userId: id,
					conferenceId: args.conferenceId,
					originId: args.originId,
					resultId: args.resultId,
					label
				});
				const stale = await tx
					.select({ id: searchHistory.id })
					.from(searchHistory)
					.where(eq(searchHistory.userId, id))
					.orderBy(desc(searchHistory.createdAt))
					.offset(KEPT_ENTRIES);
				if (stale.length > 0) {
					await tx.delete(searchHistory).where(
						inArray(
							searchHistory.id,
							stale.map((entry) => entry.id)
						)
					);
				}
			});

			searchHistoryPubsub.created();
			return true;
		}
	})
}));
