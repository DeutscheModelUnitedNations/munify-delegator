import { sql } from 'drizzle-orm';
import { STATISTICS_VIEWS } from '#api/db/statisticsViews';
import { db } from './db';
import { logger } from '#lib/logger';

const LOCK_NAME = 'refresh_statistics';

/**
 * Recomputes every statistics view, one after another and `CONCURRENTLY`, so readers keep the old
 * rows until a view is done. A transaction-level advisory lock makes a second run that overlaps this
 * one a no-op instead of a queue behind it. Returns whether this run did the refresh.
 */
export async function runRefreshStatistics(): Promise<boolean> {
	return db.transaction(async (tx) => {
		const { rows } = await tx.execute<{ acquired: boolean }>(
			sql`select pg_try_advisory_xact_lock(hashtext(${LOCK_NAME})) as acquired`
		);
		if (!rows[0]?.acquired) {
			logger.info('Another refresh is running, skipping');
			return false;
		}

		for (const viewName of STATISTICS_VIEWS) {
			await tx.execute(sql.raw(`REFRESH MATERIALIZED VIEW CONCURRENTLY "${viewName}"`));
		}
		logger.info('Statistics views refreshed', { views: STATISTICS_VIEWS.length });
		return true;
	});
}
