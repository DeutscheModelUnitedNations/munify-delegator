import { z } from 'zod';
import { db } from '#api/db/db';
import { m } from '#lib/paraglide/messages';
import {
	participantsCountSql,
	participantsPageSql,
	type ParticipantsPageQuery
} from './participantsQuery';

/** The most people one page holds, the generic table's backend page size. */
const MAX_PAGE_SIZE = 1000;

/** How many people a page holds: at least one, at most `MAX_PAGE_SIZE`. */
export const pageLimitSchema = z
	.int()
	.min(1, { error: () => m.pageLimitRange({ max: MAX_PAGE_SIZE }) })
	.max(MAX_PAGE_SIZE, { error: () => m.pageLimitRange({ max: MAX_PAGE_SIZE }) });

/** How many people to skip before the page. */
export const pageOffsetSchema = z.int().min(0, { error: () => m.pageOffsetNegative() });

/**
 * One page of the participants table's user ids, in the table's order, whether more follow, and
 * how many match across all pages.
 */
export async function loadParticipantsPage(query: ParticipantsPageQuery) {
	const [result, count] = await Promise.all([
		db.execute<{ user_id: string }>(participantsPageSql(query)),
		db.execute<{ total: number }>(participantsCountSql(query))
	]);

	const ids = result.rows.map((row) => row.user_id);
	return {
		userIds: ids.slice(0, query.limit),
		hasMore: ids.length > query.limit,
		total: count.rows[0]?.total ?? 0
	};
}
