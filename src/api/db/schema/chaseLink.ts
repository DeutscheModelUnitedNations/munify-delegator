import { snakeCase, pgEnum, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { defaultIdAndTimestamps } from './helpers';

/** The link to a MUNify CHASE instance (`docs/plans/chase-link.md`). */

export const instanceLinkStatus = pgEnum('instance_link_status', ['PENDING', 'ACTIVE', 'FROZEN']);

/** What a custom role's people are in a linked CHASE: spectators, team, or not there at all. */
export const chaseAccess = pgEnum('chase_access', ['SPECTATOR', 'TEAM', 'NONE']);

/**
 * The one link of this instance to a CHASE instance. A system-level link, so at most one row:
 * pairing again replaces a frozen one.
 */
export const instanceLink = snakeCase.table(
	'instance_link',
	{
		...defaultIdAndTimestamps,
		/** The CHASE instance's origin, `https://…` (http only for localhost). */
		remoteUrl: text().notNull(),
		status: instanceLinkStatus().default('PENDING').notNull(),
		/** SHA-256 of the token CHASE sends with its requests. */
		inboundTokenHash: text().notNull(),
		/** The token this instance sends to CHASE, encrypted with `SECRET`; null until approved. */
		outboundToken: text(),
		/** Shown on both sides while pending, for the admins to compare. */
		confirmationCode: text().notNull(),
		linkedAt: timestamp({ precision: 3 }),
		/** The last notice the link worker received from CHASE. */
		lastEventAt: timestamp({ precision: 3 }),
		/** The last full reconcile, run on every (re)connect. */
		lastReconcileAt: timestamp({ precision: 3 }),
		lastError: text()
	},
	() => [uniqueIndex('instance_link_single_row').using('btree', sql`(true)`)]
);
