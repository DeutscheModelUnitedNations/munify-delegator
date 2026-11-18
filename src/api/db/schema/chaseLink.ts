import { snakeCase, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { defaultIdAndTimestamps } from './helpers';

/**
 * The state of the link to a MUNify CHASE instance (`docs/plans/chase-link.md`). The link itself is
 * configuration (`LINK_REMOTE_URL` and the rest, `#api/handlers/chaseLink/linkAuth`): the row exists
 * while it is configured, written at start-up, and holds where it points and how the link worker
 * fares. At most one row.
 */
export const instanceLink = snakeCase.table(
	'instance_link',
	{
		...defaultIdAndTimestamps,
		/** The CHASE instance's origin, `LINK_REMOTE_URL`. */
		remoteUrl: text().notNull(),
		/** The last notice the link worker received from CHASE. */
		lastEventAt: timestamp({ precision: 3 }),
		/** The last full reconcile, run on every (re)connect. */
		lastReconcileAt: timestamp({ precision: 3 }),
		lastError: text()
	},
	() => [uniqueIndex('instance_link_single_row').using('btree', sql`(true)`)]
);
