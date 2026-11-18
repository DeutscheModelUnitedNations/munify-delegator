import { and, eq, lte } from 'drizzle-orm';
import { db, schema } from '#api/db/db';
import { announcementPubsub } from '#api/pubsub';

/**
 * Tells open pages of the scheduled announcements whose time has come, once each: nothing in the
 * app runs on a timer, so the `send-emails` job calls this. Answers how many that were.
 */
export async function announceReleasedAnnouncements(now = new Date()) {
	const table = schema.announcement;
	const released = await db
		.update(table)
		.set({ releaseAnnounced: true })
		.where(
			and(
				eq(table.status, 'PUBLISHED'),
				eq(table.releaseAnnounced, false),
				lte(table.publishAt, now)
			)
		)
		.returning({ id: table.id });
	if (released.length > 0) {
		announcementPubsub.updated(released.map((row) => row.id));
		announcementPubsub.created();
	}
	return released.length;
}
