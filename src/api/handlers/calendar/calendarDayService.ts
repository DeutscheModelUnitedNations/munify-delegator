import { db, schema } from '#api/db/db';
import { whereRows } from '#api/db/whereRows';
import { calendarDayPubsub, calendarEntryPubsub, calendarTrackPubsub } from '#api/pubsub';

/**
 * Deletes a day with its entries. The conference's tracks stay; they no longer run on it, which
 * their readers are told.
 */
export async function deleteCalendarDay(id: string) {
	const { entryCount, trackIds } = await db.transaction(async (tx) => {
		const day = await tx.query.calendarDay.findFirst({
			where: { id },
			columns: { id: true },
			with: { entries: { columns: { id: true } }, tracks: { columns: { id: true } } }
		});
		await tx
			.delete(schema.calendarDay)
			.where(whereRows({ table: schema.calendarDay, filter: { id } }));
		return {
			entryCount: day?.entries.length ?? 0,
			trackIds: day?.tracks.map((track) => track.id) ?? []
		};
	});
	calendarDayPubsub.removed();
	if (entryCount > 0) calendarEntryPubsub.removed();
	if (trackIds.length > 0) calendarTrackPubsub.updated(trackIds);
}
