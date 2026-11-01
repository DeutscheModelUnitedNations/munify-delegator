import { db, schema } from '#api/db/db';
import { searchHistoryPubsub } from '#api/pubsub';
import { whereRows } from '#api/db/whereRows';
import { m } from '#lib/paraglide/messages';
import { z } from 'zod';

/** How many searches a person keeps. The search only offers the newest five. */
const KEPT_ENTRIES = 20;
const MAX_LABEL_LENGTH = 200;

/** A picked result: the tab it was picked in, its id, and the label shown for it, trimmed and cut to length. */
export const recordSearchSchemas = {
	originId: z.string().min(1, { error: () => m.searchHistoryNeedsIdAndLabel() }),
	resultId: z.string().min(1, { error: () => m.searchHistoryNeedsIdAndLabel() }),
	label: z
		.string()
		.trim()
		.min(1, { error: () => m.searchHistoryNeedsIdAndLabel() })
		.transform((label) => label.slice(0, MAX_LABEL_LENGTH))
};

/**
 * Records a result `userId` picked in the search. Picking the same result again moves it to the
 * top instead of listing it twice, and only the newest entries are kept.
 */
export async function recordSearch({
	userId,
	args
}: {
	userId: string;
	args: { conferenceId: string; originId: string; resultId: string; label: string };
}) {
	const { searchHistory } = schema;
	const { conferenceId, originId, resultId, label } = args;
	await db.transaction(async (tx) => {
		await tx.delete(searchHistory).where(
			whereRows({
				table: searchHistory,
				filter: { userId, conferenceId, resultId }
			})
		);
		await tx.insert(searchHistory).values({ userId, conferenceId, originId, resultId, label });
		const stale = await tx.query.searchHistory.findMany({
			where: { userId },
			columns: { id: true },
			orderBy: { createdAt: 'desc' },
			offset: KEPT_ENTRIES
		});
		if (stale.length > 0) {
			await tx.delete(searchHistory).where(
				whereRows({
					table: searchHistory,
					filter: { id: { in: stale.map((entry) => entry.id) } }
				})
			);
		}
	});
	searchHistoryPubsub.created();
	// The entry picked again and the oldest ones went
	searchHistoryPubsub.removed();
}
