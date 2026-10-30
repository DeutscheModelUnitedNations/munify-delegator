import { sql } from 'drizzle-orm';
import { STATISTICS_VIEWS } from '#api/db/statisticsViews';
import { db } from './db';

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
			console.info('Another refresh is running, skipping');
			return false;
		}

		for (const viewName of STATISTICS_VIEWS) {
			await tx.execute(sql.raw(`REFRESH MATERIALIZED VIEW CONCURRENTLY "${viewName}"`));
		}
		console.info(`${STATISTICS_VIEWS.length} statistics views refreshed`);
		return true;
	});
}
