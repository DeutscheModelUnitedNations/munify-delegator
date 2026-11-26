import { db } from '#api/db/db';
import * as schema from '#api/db/schema/index';
import { and, eq } from 'drizzle-orm';

/**
 * Calendar subscription links: one row per person and conference. The link's token is derived
 * from the row's id (`calendarFeedToken.ts`), so nothing here is secret on its own. Nothing in
 * the app lists these rows live, so the writes publish nothing.
 */

/** The id of the person's feed of the conference, made on first use. */
export async function ensureCalendarFeed({
	userId,
	conferenceId
}: {
	userId: string;
	conferenceId: string;
}) {
	await db.insert(schema.calendarFeed).values({ userId, conferenceId }).onConflictDoNothing();
	const feed = await db.query.calendarFeed.findFirst({
		where: { userId, conferenceId },
		columns: { id: true }
	});
	if (!feed) throw new Error('The calendar feed vanished right after it was made');
	return feed.id;
}

/** Replaces the person's feed of the conference with a new one: the old link stops working. */
export async function resetCalendarFeed({
	userId,
	conferenceId
}: {
	userId: string;
	conferenceId: string;
}) {
	return db.transaction(async (tx) => {
		await tx
			.delete(schema.calendarFeed)
			.where(
				and(
					eq(schema.calendarFeed.userId, userId),
					eq(schema.calendarFeed.conferenceId, conferenceId)
				)
			);
		const [feed] = await tx
			.insert(schema.calendarFeed)
			.values({ userId, conferenceId })
			.returning({ id: schema.calendarFeed.id });
		if (!feed) throw new Error('Making the calendar feed failed');
		return feed.id;
	});
}

/** Whose feed this is and of which conference; undefined for a feed that does not exist (any more). */
export function calendarFeedOwner(feedId: string) {
	return db.query.calendarFeed.findFirst({
		where: { id: feedId },
		columns: { userId: true, conferenceId: true }
	});
}
