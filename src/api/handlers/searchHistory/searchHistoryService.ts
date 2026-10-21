import { db, schema } from '$api/db/db';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { m } from '#lib/paraglide/messages.js';
import { apiError } from '$api/services/errors/apiError';

/** How many searches a person keeps. The search only offers the newest five. */
const KEPT_ENTRIES = 20;
const MAX_LABEL_LENGTH = 200;

/**
 * Records a result `userId` picked in the search. Picking the same result again moves it to the
 * top instead of listing it twice, and only the newest entries are kept.
 */
export async function recordSearch(
	userId: string,
	args: { conferenceId: string; originId: string; resultId: string; label: string }
) {
	const label = args.label.trim().slice(0, MAX_LABEL_LENGTH);
	if (!label || !args.resultId) throw apiError('INVALID_INPUT', m.searchHistoryNeedsIdAndLabel());

	const { searchHistory } = schema;
	await db.transaction(async (tx) => {
		await tx
			.delete(searchHistory)
			.where(
				and(
					eq(searchHistory.userId, userId),
					eq(searchHistory.conferenceId, args.conferenceId),
					eq(searchHistory.resultId, args.resultId)
				)
			);
		await tx.insert(searchHistory).values({
			userId,
			conferenceId: args.conferenceId,
			originId: args.originId,
			resultId: args.resultId,
			label
		});
		const stale = await tx
			.select({ id: searchHistory.id })
			.from(searchHistory)
			.where(eq(searchHistory.userId, userId))
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
}
